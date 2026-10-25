package com.chess960.backend.rules;

/**
 * A chess position: the board, whose turn it is, and the state needed to generate moves
 * correctly (castling rights, the en passant target square, and the two move counters
 * FEN requires). Mutable, with {@link #makeMove} / {@link #undoMove} rather than returning
 * a new position each time, so {@link Perft} can search deeply without allocating a new
 * 64-square array at every node.
 */
public final class Position {

    private final Piece[] board = new Piece[64];
    private Color sideToMove = Color.WHITE;
    private CastlingRights castling = new CastlingRights();
    private int enPassantSquare = Square.NONE;
    private int halfmoveClock = 0;
    private int fullmoveNumber = 1;

    public Piece pieceAt(int square) {
        return board[square];
    }

    public void place(int square, Piece piece) {
        board[square] = piece;
    }

    public Color sideToMove() {
        return sideToMove;
    }

    public void setSideToMove(Color color) {
        this.sideToMove = color;
    }

    public CastlingRights castling() {
        return castling;
    }

    public void setCastling(CastlingRights castling) {
        this.castling = castling;
    }

    public int enPassantSquare() {
        return enPassantSquare;
    }

    public void setEnPassantSquare(int square) {
        this.enPassantSquare = square;
    }

    public int halfmoveClock() {
        return halfmoveClock;
    }

    public void setHalfmoveClock(int halfmoveClock) {
        this.halfmoveClock = halfmoveClock;
    }

    public int fullmoveNumber() {
        return fullmoveNumber;
    }

    public void setFullmoveNumber(int fullmoveNumber) {
        this.fullmoveNumber = fullmoveNumber;
    }

    public int findKing(Color color) {
        for (int square = 0; square < 64; square++) {
            Piece piece = board[square];
            if (piece != null && piece.type() == PieceType.KING && piece.color() == color) {
                return square;
            }
        }
        throw new IllegalStateException("No " + color + " king on the board");
    }

    /** What {@link #undoMove} needs to put the board back exactly as it was. */
    public record UndoInfo(
            Piece movedPiece,
            Piece capturedPiece,
            int capturedSquare,
            CastlingRights previousCastling,
            int previousEnPassantSquare,
            int previousHalfmoveClock,
            int previousFullmoveNumber) {}

    /**
     * Applies a pseudo-legal move in place. Does not check legality (king safety) -
     * {@link MoveGenerator} is responsible for only offering legal moves, or for calling
     * {@link #undoMove} when a pseudo-legal move turns out to leave the king in check.
     */
    public UndoInfo makeMove(Move move) {
        Piece movedPiece = board[move.from()];
        CastlingRights previousCastling = castling.copy();
        int previousEnPassant = enPassantSquare;
        int previousHalfmove = halfmoveClock;
        int previousFullmove = fullmoveNumber;

        Piece capturedPiece = null;
        int capturedSquare = Square.NONE;
        int newEnPassantSquare = Square.NONE;
        boolean pawnOrCapture = movedPiece.type() == PieceType.PAWN;

        switch (move.flag()) {
            case CASTLE -> {
                Piece rook = board[move.to()];
                int backRank = Square.rank(move.from());
                boolean kingside = Square.file(move.to()) > Square.file(move.from());
                int kingDestFile = kingside ? 6 : 2; // g-file or c-file
                int rookDestFile = kingside ? 5 : 3; // f-file or d-file
                int kingDest = Square.of(kingDestFile, backRank);
                int rookDest = Square.of(rookDestFile, backRank);

                board[move.from()] = null;
                board[move.to()] = null;
                board[kingDest] = movedPiece;
                board[rookDest] = rook;

                castling.clearAll(movedPiece.color());
            }
            case EN_PASSANT -> {
                capturedSquare = Square.of(Square.file(move.to()), Square.rank(move.from()));
                capturedPiece = board[capturedSquare];
                board[capturedSquare] = null;
                board[move.to()] = movedPiece;
                board[move.from()] = null;
                pawnOrCapture = true;
            }
            case NORMAL -> {
                capturedPiece = board[move.to()];
                if (capturedPiece != null) {
                    capturedSquare = move.to();
                    pawnOrCapture = true;
                    castling.clearRook(capturedPiece.color(), move.to());
                }
                Piece placed =
                        move.promotion() != null
                                ? new Piece(move.promotion(), movedPiece.color())
                                : movedPiece;
                board[move.to()] = placed;
                board[move.from()] = null;

                if (movedPiece.type() == PieceType.KING) {
                    castling.clearAll(movedPiece.color());
                } else if (movedPiece.type() == PieceType.ROOK) {
                    castling.clearRook(movedPiece.color(), move.from());
                } else if (movedPiece.type() == PieceType.PAWN
                        && Math.abs(move.to() - move.from()) == 16) {
                    newEnPassantSquare = (move.to() + move.from()) / 2;
                }
            }
        }

        enPassantSquare = newEnPassantSquare;
        halfmoveClock = pawnOrCapture ? 0 : halfmoveClock + 1;
        if (sideToMove == Color.BLACK) {
            fullmoveNumber++;
        }
        sideToMove = sideToMove.opposite();

        return new UndoInfo(
                movedPiece,
                capturedPiece,
                capturedSquare,
                previousCastling,
                previousEnPassant,
                previousHalfmove,
                previousFullmove);
    }

    public void undoMove(Move move, UndoInfo undo) {
        sideToMove = sideToMove.opposite();

        switch (move.flag()) {
            case CASTLE -> {
                int backRank = Square.rank(move.from());
                boolean kingside = Square.file(move.to()) > Square.file(move.from());
                int kingDest = Square.of(kingside ? 6 : 2, backRank);
                int rookDest = Square.of(kingside ? 5 : 3, backRank);
                Piece rook = board[rookDest];

                board[kingDest] = null;
                board[rookDest] = null;
                board[move.from()] = undo.movedPiece();
                board[move.to()] = rook;
            }
            case EN_PASSANT -> {
                board[move.from()] = undo.movedPiece();
                board[move.to()] = null;
                board[undo.capturedSquare()] = undo.capturedPiece();
            }
            case NORMAL -> {
                board[move.from()] = undo.movedPiece();
                board[move.to()] = undo.capturedPiece();
            }
        }

        castling = undo.previousCastling();
        enPassantSquare = undo.previousEnPassantSquare();
        halfmoveClock = undo.previousHalfmoveClock();
        fullmoveNumber = undo.previousFullmoveNumber();
    }
}
