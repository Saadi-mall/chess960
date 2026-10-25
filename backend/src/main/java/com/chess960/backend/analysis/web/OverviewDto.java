package com.chess960.backend.analysis.web;

public record OverviewDto(Integer positionNumber, SideOverviewDto white, SideOverviewDto black) {}
