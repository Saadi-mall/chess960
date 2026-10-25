package com.chess960.backend.game.web;

import com.chess960.backend.game.DailyPosition;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Shared by the Play tab's "today's lesson" game-creation option, the Analyze tab, and
 * the Learn tab - all three need to agree on the same Chess960 number for today. */
@RestController
public class DailyPositionController {

    @GetMapping("/api/daily-position")
    public DailyPositionResponse today() {
        LocalDate date = LocalDate.now();
        return new DailyPositionResponse(date.toString(), DailyPosition.numberFor(date));
    }

    public record DailyPositionResponse(String date, int number) {}
}
