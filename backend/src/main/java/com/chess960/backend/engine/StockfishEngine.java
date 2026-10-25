package com.chess960.backend.engine;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Talks to a Stockfish process over UCI, with {@code UCI_Chess960} turned on so it reads
 * Shredder-FEN and answers with Chess960-style castling moves (king-captures-rook, e.g.
 * "e1h1") - exactly the encoding this app's own {@link com.chess960.backend.rules.Move}
 * already uses, so no translation is needed either way.
 *
 * <p>Starts a fresh process per evaluation rather than keeping a pool of engines running:
 * simpler, with no shared-process concurrency to reason about, at the cost of ~50-100ms of
 * process startup on every call. Fine for a position-at-a-time analysis tool; would need
 * revisiting for something that evaluated many positions per second.
 */
@Component
public class StockfishEngine {

    private static final Pattern SCORE_PATTERN = Pattern.compile("score (cp|mate) (-?\\d+)");
    private static final Pattern DEPTH_PATTERN = Pattern.compile("(?:^| )depth (\\d+)");

    private final String executable;

    public StockfishEngine(@Value("${chess960.stockfish-path:stockfish}") String executable) {
        this.executable = executable;
    }

    public EngineEvaluation evaluate(String fen, int movetimeMillis) {
        Process process;
        try {
            process = new ProcessBuilder(executable).redirectErrorStream(true).start();
        } catch (IOException e) {
            throw new EngineException("Could not start Stockfish (" + executable + ")", e);
        }

        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            Future<EngineEvaluation> future = executor.submit(() -> communicate(process, fen, movetimeMillis));
            return future.get(movetimeMillis + 5000L, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            throw new EngineException("Stockfish timed out", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EngineException("Interrupted while waiting for Stockfish", e);
        } catch (ExecutionException e) {
            throw new EngineException("Stockfish failed", e.getCause());
        } finally {
            process.destroyForcibly();
            executor.shutdownNow();
        }
    }

    private EngineEvaluation communicate(Process process, String fen, int movetimeMillis) throws IOException {
        try (BufferedReader reader =
                        new BufferedReader(
                                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
                Writer writer = new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8)) {

            send(writer, "uci");
            waitForLine(reader, "uciok");
            send(writer, "setoption name UCI_Chess960 value true");
            send(writer, "isready");
            waitForLine(reader, "readyok");
            send(writer, "position fen " + fen);
            send(writer, "go movetime " + movetimeMillis);

            Integer scoreCp = null;
            Integer mateIn = null;
            int depth = 0;

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("info ") && line.contains(" score ")) {
                    Matcher score = SCORE_PATTERN.matcher(line);
                    if (score.find()) {
                        int value = Integer.parseInt(score.group(2));
                        if (score.group(1).equals("cp")) {
                            scoreCp = value;
                            mateIn = null;
                        } else {
                            mateIn = value;
                            scoreCp = null;
                        }
                    }
                    Matcher depthMatch = DEPTH_PATTERN.matcher(line);
                    if (depthMatch.find()) {
                        depth = Integer.parseInt(depthMatch.group(1));
                    }
                } else if (line.startsWith("bestmove")) {
                    String[] parts = line.split("\\s+");
                    String bestMove = parts.length > 1 ? parts[1] : null;
                    return new EngineEvaluation(bestMove, scoreCp, mateIn, depth);
                }
            }
            throw new EngineException("Stockfish closed its output before answering");
        }
    }

    private void send(Writer writer, String command) throws IOException {
        writer.write(command);
        writer.write('\n');
        writer.flush();
    }

    private void waitForLine(BufferedReader reader, String expected) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.trim().equals(expected)) {
                return;
            }
        }
        throw new EngineException("Stockfish closed its output before sending \"" + expected + "\"");
    }
}
