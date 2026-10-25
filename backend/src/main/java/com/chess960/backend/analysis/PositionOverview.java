package com.chess960.backend.analysis;

/**
 * @param positionNumber the Chess960 number (518 is standard chess) if White's back rank
 *     is still a legal, untouched Chess960 arrangement; null otherwise
 */
public record PositionOverview(Integer positionNumber, SideOverview white, SideOverview black) {}
