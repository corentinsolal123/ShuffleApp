import { describe, expect, it, vi } from "vitest";
import {
  WeatherError,
  fetchDayWeather,
  forecastUrl,
  summarizeDay,
  toConditions,
  weatherLabel,
  type Forecast,
} from "@/lib/weather";
import { forecast } from "@/tests/fixtures/forecast";

describe("forecastUrl", () => {
  it("asks Open-Meteo for today's hourly and 15-minute data in local time", () => {
    const url = new URL(forecastUrl({ latitude: 48.85661, longitude: 2.35222 }));

    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("48.8566");
    expect(url.searchParams.get("hourly")).toContain("apparent_temperature");
    expect(url.searchParams.get("minutely_15")).toBe("precipitation");
    expect(url.searchParams.get("timezone")).toBe("auto");
    expect(url.searchParams.get("forecast_days")).toBe("1");
  });
});

describe("summarizeDay", () => {
  it("averages the feels-like temperature between 8 h and 18 h only", () => {
    // 0 °C at night, 10 °C from 8 h to 11 h (4 h), 20 °C from 12 h to 17 h (6 h).
    const day = summarizeDay(forecast({ feelsLike: (h) => (h < 8 || h >= 18 ? 0 : h <= 11 ? 10 : 20) }));

    expect(day?.feelsLike).toBe(16);
    expect(day?.hourly).toHaveLength(24);
  });

  it("reports min and max temperatures over the daytime window", () => {
    const day = summarizeDay(forecast({ temperature: (h) => h }));
    expect(day).toMatchObject({ temperatureMin: 8, temperatureMax: 17 });
  });

  it("ignores a short drizzle below the threshold", () => {
    // 0.4 mm over one hour → 0.1 mm per quarter-hour: not rain.
    const day = summarizeDay(forecast({ rainMm: (h) => (h === 10 ? 0.4 : 0) }));
    expect(day).toMatchObject({ rain: false, rainySlots: 0 });
  });

  it("detects meaningful rain during the day", () => {
    const day = summarizeDay(forecast({ rainMm: (h) => (h === 14 ? 2 : 0) }));
    expect(day).toMatchObject({ rain: true, rainySlots: 4 });
  });

  it("ignores rain outside the daytime window", () => {
    const day = summarizeDay(forecast({ rainMm: (h) => (h === 6 || h === 18 || h === 22 ? 5 : 0) }));
    expect(day?.rain).toBe(false);
  });

  it("falls back to hourly rain when the 15-minute series is missing", () => {
    const day = summarizeDay(forecast({ withQuarterHours: false, rainMm: (h) => (h === 9 ? 1 : 0) }));
    expect(day).toMatchObject({ rain: true, rainySlots: 1 });
  });

  it("keeps the most significant weather code of the day", () => {
    const day = summarizeDay(forecast({ weatherCode: (h) => (h === 15 ? 63 : 1) }));
    expect(day?.weatherCode).toBe(63);
  });

  it("tolerates missing values and returns null without any daytime temperature", () => {
    const partial = forecast();
    partial.hourly.apparent_temperature = partial.hourly.apparent_temperature.map((value, hour) =>
      hour === 9 ? null : value,
    );
    expect(summarizeDay(partial)?.feelsLike).toBe(15);

    const empty = forecast();
    empty.hourly.apparent_temperature = empty.hourly.apparent_temperature.map(() => null);
    expect(summarizeDay(empty)).toBeNull();
  });

  it("produces the engine conditions", () => {
    const day = summarizeDay(forecast({ feelsLike: () => 4, rainMm: () => 1 }))!;
    expect(toConditions(day)).toEqual({ feelsLike: 4, rain: true });
  });
});

describe("weatherLabel", () => {
  it.each([
    [0, "Ensoleillé"],
    [3, "Couvert"],
    [45, "Brouillard"],
    [61, "Pluie"],
    [81, "Averses"],
    [95, "Orage"],
    [null, "Conditions inconnues"],
  ] as const)("labels WMO code %s", (code, label) => {
    expect(weatherLabel(code)).toBe(label);
  });
});

describe("fetchDayWeather", () => {
  const coordinates = { latitude: 45.76, longitude: 4.84 };
  const respond = (body: unknown, init?: ResponseInit) => vi.fn(async () => Response.json(body, init));

  it("returns the day summary", async () => {
    const fetchFn = respond(forecast({ feelsLike: () => 7 }));
    const day = await fetchDayWeather(coordinates, { fetchFn });

    expect(day.feelsLike).toBe(7);
    expect(fetchFn).toHaveBeenCalledWith(expect.stringContaining("latitude=45.7600"), expect.anything());
  });

  it("explains network, HTTP and payload failures", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(fetchDayWeather(coordinates, { fetchFn: offline })).rejects.toThrow("Météo injoignable");
    await expect(fetchDayWeather(coordinates, { fetchFn: respond({}, { status: 503 }) })).rejects.toThrow(
      "ne répond pas",
    );
    await expect(fetchDayWeather(coordinates, { fetchFn: respond({ nope: true }) })).rejects.toBeInstanceOf(
      WeatherError,
    );
  });

  it("lets an abort propagate untouched", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = vi.fn(async () => {
      throw new DOMException("Aborted", "AbortError");
    });
    await expect(
      fetchDayWeather(coordinates, { fetchFn: aborted, signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

// Type-level check that the fixture matches the schema used in production.
const _typed: Forecast = forecast();
void _typed;
