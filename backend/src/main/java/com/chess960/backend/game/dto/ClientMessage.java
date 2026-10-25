package com.chess960.backend.game.dto;

/**
 * Every message a client can send, as one flat shape distinguished by {@code type}. Fields
 * irrelevant to a given type are just left null - simpler than a class hierarchy for a
 * handful of small, rarely-changing message kinds.
 */
public record ClientMessage(String type, String from, String to, String promotion, Boolean accept) {}
