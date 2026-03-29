import { render, screen } from "@testing-library/react";

import MatchScoreRing from "./MatchScoreRing";

describe("MatchScoreRing", () => {
  it("renders percentage label", () => {
    render(<MatchScoreRing score={72.1} />);
    expect(screen.getByText("72%")).toBeInTheDocument();
  });
});
