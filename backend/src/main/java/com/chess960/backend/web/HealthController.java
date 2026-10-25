package com.chess960.backend.web;

import java.sql.Connection;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Proves the full stack is wired up: backend reachable, database reachable.
 * Used by the frontend scaffold and by `docker compose up --build` smoke checks.
 */
@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        boolean dbReachable;
        try (Connection connection = dataSource.getConnection()) {
            dbReachable = connection.isValid(2);
        } catch (Exception e) {
            dbReachable = false;
        }
        return Map.of("status", "ok", "database", dbReachable ? "up" : "down");
    }
}
