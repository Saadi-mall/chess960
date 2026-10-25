package com.chess960.backend.position;

import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Move;
import com.chess960.backend.rules.MoveGenerator;
import com.chess960.backend.rules.Piece;
import com.chess960.backend.rules.PieceType;
import com.chess960.backend.rules.Position;
import com.chess960.backend.rules.Square;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Stateless rules for the Analyze tab's sandbox: unlike a {@link com.chess960.backend.game.Game},
 * there's no clock, no opponent and nothing persisted between calls - each request carries
 * the whole position and gets back the result of one move on it. Kept separate from Game
 * rather than reusing it, since Game's clocks, tokens and draw-offer state don't apply
 * here and would just be dead weight.
 *
 * <p>Threefold repetition isn't checked here, since that needs the position history a
 * stateless endpoint doesn't have - everything else Game checks (checkmate, stalemate,
 * insufficient material, the 50-move rule) works from a single FEN and is checked the same
 * way.
 */
@Service
public class PositionService {

    public PositionStateResponse legalMovesFor(String fen) {
        Position position = Fen.parse(fen);
        return stateOf(position);
    }

    public PositionStateResponse applyMove(MoveRequest request) {
        Position position = Fen.parse(request.fen());
        PieceType promotion = promotionType(request.promotion());

        Move move =
                MoveGenerator.legalMoves(position).stream()
                        .filter(
                                m ->
                                        m.from() == Square.fromAlgebraic(request.from())
                                                && m.to() == Square.fromAlgebraic(request.to())
                                                && m.promotion() == promotion)
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Illegal move"));

        position.makeMove(move);
        return stateOf(position);
    }

    private PositionStateResponse stateOf(Position position) {
        List<Move> legalMoves = MoveGenerator.legalMoves(position);
        boolean inCheck = MoveGenerator.isInCheck(position, position.sideToMove());

        String status;
        String winner = null;
        if (legalMoves.isEmpty()) {
            status = inCheck ? "CHECKMATE" : "STALEMATE";
            winner = inCheck ? colorName(position.sideToMove().opposite()) : null;
        } else if (!hasSufficientMatingMaterial(position, Color.WHITE)
                && !hasSufficientMatingMaterial(position, Color.BLACK)) {
            status = "DRAW_INSUFFICIENT_MATERIAL";
        } else if (position.halfmoveClock() >= 100) {
            status = "DRAW_FIFTY_MOVE";
        } else {
            status = "IN_PROGRESS";
        }

        return new PositionStateResponse(
                Fen.toShredderFen(position),
                legalMoves.stream().map(this::toDto).toList(),
                colorName(position.sideToMove()),
                status,
                winner);
    }

    private boolean hasSufficientMatingMaterial(Position position, Color color) {
        int minorPieces = 0;
        for (int square = 0; square < 64; square++) {
            Piece piece = position.pieceAt(square);
            if (piece == null || piece.color() != color || piece.type() == PieceType.KING) {
                continue;
            }
            if (piece.type() == PieceType.PAWN || piece.type() == PieceType.ROOK || piece.type() == PieceType.QUEEN) {
                return true;
            }
            minorPieces++;
        }
        return minorPieces >= 2;
    }

    private MoveDto toDto(Move move) {
        return new MoveDto(
                Square.toAlgebraic(move.from()), Square.toAlgebraic(move.to()), promotionLetter(move.promotion()));
    }

    private static String colorName(Color color) {
        return color == Color.WHITE ? "white" : "black";
    }

    private static String promotionLetter(PieceType type) {
        if (type == null) return null;
        return switch (type) {
            case QUEEN -> "q";
            case ROOK -> "r";
            case BISHOP -> "b";
            case KNIGHT -> "n";
            default -> throw new IllegalArgumentException("Not promotable: " + type);
        };
    }

    private static PieceType promotionType(String letter) {
        if (letter == null) return null;
        return switch (letter) {
            case "q" -> PieceType.QUEEN;
            case "r" -> PieceType.ROOK;
            case "b" -> PieceType.BISHOP;
            case "n" -> PieceType.KNIGHT;
            default -> throw new IllegalArgumentException("Not a promotion letter: " + letter);
        };
    }
}
