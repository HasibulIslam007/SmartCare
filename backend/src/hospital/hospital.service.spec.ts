import { hospitalToday } from "./hospital.service";
describe("hospital calendar", () => {
  afterEach(() => jest.useRealTimers());
  it("uses the hospital date across the UTC midnight boundary", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-18T19:00:00Z"));
    expect(hospitalToday()).toBe("2026-09-19");
  });
});
