import { describe, expect, it } from "vitest";
import { shapePublicTeamMembers } from "./public-data-shaping";

describe("shapePublicTeamMembers", () => {
  it("keeps only rows with an explicit non-empty public display name", () => {
    const result = shapePublicTeamMembers([
      {
        id: "1",
        kind: "player",
        display_name: "Hanako",
        shirt_number: 12,
        primary_position: "CB",
        grade_or_age: "高校2年",
        image_path: null,
      },
      {
        id: "2",
        kind: "player",
        display_name: "   ",
        shirt_number: 8,
        primary_position: "RB",
        grade_or_age: null,
        image_path: null,
      },
    ]);

    expect(result).toEqual([
      {
        id: "1",
        kind: "player",
        displayName: "Hanako",
        shirtNumber: 12,
        primaryPosition: "CB",
        gradeOrAge: "高校2年",
        imagePath: null,
      },
    ]);
  });
});
