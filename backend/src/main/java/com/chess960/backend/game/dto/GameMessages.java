package com.chess960.backend.game.dto;

import com.chess960.backend.game.Game;
import com.chess960.backend.rules.Color;
import com.chess960.backend.rules.Fen;
import com.chess960.backend.rules.Move;
import com.chess960.backend.rules.PieceType;
import com.chess960.backend.rules.Square;
import java.util.List;

/** Builds the DTOs sent over the WebSocket out of the rules engine's own types. */
public final class GameMessages {

    private GameMessages() {}

    public static GameStateMessage stateOf(Game game) {
        List<MoveDto> legalMoves =
                game.legalMoves().stream()
                        .map(GameMessages::toMoveDto)
                        .toList();

        return new GameStateMessage(
                "STATE",
                Fen.toShredderFen(game.position()),
                game.startingNumber(),
                game.timeControl().initialSeconds(),
                game.timeControl().incrementSeconds(),
                legalMoves,
                colorName(game.position().sideToMove()),
                game.status().name(),
                colorName(game.winner()),
                colorName(game.drawOfferBy()),
                game.remainingMillis(Color.WHITE),
                game.remainingMillis(Color.BLACK),
                game.moveHistory(),
                game.fenHistory(),
                game.playedMoves().stream().map(GameMessages::toMoveDto).toList(),
                game.isConnected(Color.WHITE),
                game.isConnected(Color.BLACK));
    }

    private static MoveDto toMoveDto(Move move) {
        return new MoveDto(
                Square.toAlgebraic(move.from()),
                Square.toAlgebraic(move.to()),
                promotionLetter(move.promotion()));
    }

    public static String colorName(Color color) {
        if (color == null) return null;
        return color == Color.WHITE ? "white" : "black";
    }

    public static Color colorFromName(String name) {
        if (name == null) return null;
        return name.equals("white") ? Color.WHITE : Color.BLACK;
    }

    public static String promotionLetter(PieceType type) {
        if (type == null) return null;
        return switch (type) {
            case QUEEN -> "q";
            case ROOK -> "r";
            case BISHOP -> "b";
            case KNIGHT -> "n";
            default -> throw new IllegalArgumentException("Not promotable: " + type);
        };
    }

    public static PieceType promotionType(String letter) {
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
