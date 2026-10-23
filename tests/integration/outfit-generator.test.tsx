import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OutfitGenerator } from "@/components/outfits/outfit-generator";
import type { GarmentWithPhoto } from "@/lib/garments/model";
import { forecast } from "@/tests/fixtures/forecast";
import { server } from "@/tests/msw/server";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const WORK = "occ-work";
const DAILY = "occ-daily";
const OCCASIONS = [
  { id: DAILY, name: "Quotidien" },
  { id: WORK, name: "Travail" },
];

const garment = (id: string, category: GarmentWithPhoto["category"], patch: Partial<GarmentWithPhoto> = {}) => ({
  id,
  name: id,
  category,
  colors: ["grey" as const],
  seasons: [],
  occasionIds: [DAILY],
  warmth: 2 as const,
  rainOk: true,
  photoPath: `u/${id}.webp`,
  photoUrl: `https://photos.test/${id}.webp`,
  ...patch,
});

const WARDROBE: GarmentWithPhoto[] = [
  garment("Chemise", "top", { occasionIds: [DAILY, WORK] }),
  garment("Pull", "top"),
  garment("Tee-shirt", "top"),
  garment("Chino", "bottom", { occasionIds: [DAILY, WORK] }),
  garment("Jean", "bottom"),
  garment("Short", "bottom"),
  garment("Derbies", "shoes", { occasionIds: [DAILY, WORK] }),
  garment("Baskets", "shoes", { rainOk: false }),
  garment("Bottes", "shoes"),
];

const NO_RULES = { garmentExclusions: [], colorExclusions: [] };

type GeolocationOutcome = { latitude: number; longitude: number } | "denied";

function mockGeolocation(outcome: GeolocationOutcome) {
  const getCurrentPosition = vi.fn((success: PositionCallback, failure?: PositionErrorCallback | null) => {
    if (outcome === "denied") {
      failure?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" } as GeolocationPositionError);
    } else {
      success({ coords: outcome } as GeolocationPosition);
    }
  });
  Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
}

function mockForecast(body = forecast()) {
  const requests: URL[] = [];
  server.use(
    http.get(FORECAST_URL, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json(body);
    }),
  );
  return requests;
}

function renderGenerator(props: Partial<Parameters<typeof OutfitGenerator>[0]> = {}) {
  render(
    <OutfitGenerator garments={WARDROBE} rules={NO_RULES} occasions={OCCASIONS} defaultCity={null} {...props} />,
  );
}

async function weatherReady() {
  return screen.findByRole("button", { name: /Voir le détail de la journée/ });
}

beforeEach(() => {
  mockGeolocation({ latitude: 48.85, longitude: 2.35 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OutfitGenerator", () => {
  it("uses today's weather, then generates three outfits of three photos", async () => {
    const requests = mockForecast(forecast({ feelsLike: () => 12 }));
    const user = userEvent.setup();
    renderGenerator();

    expect(screen.getByRole("button", { name: "Météo en cours…" })).toBeDisabled();
    expect(await weatherReady()).toHaveTextContent("12°");
    expect(requests[0]?.searchParams.get("latitude")).toBe("48.8500");

    await user.click(screen.getByRole("button", { name: "Générer" }));

    const outfits = screen.getAllByRole("article");
    expect(outfits).toHaveLength(3);
    for (const outfit of outfits) {
      expect(within(outfit).getAllByRole("link")).toHaveLength(3);
    }
    expect(screen.getByRole("button", { name: "Générer à nouveau" })).toBeEnabled();
  });

  it("explains which filter blocks: no rain-proof shoes", async () => {
    mockForecast(forecast({ rainMm: () => 1 }));
    const user = userEvent.setup();
    renderGenerator({
      garments: WARDROBE.map((g) => (g.category === "shoes" ? { ...g, rainOk: false } : g)),
    });

    expect(await weatherReady()).toHaveTextContent("Partiellement nuageux · pluie prévue");
    await user.click(screen.getByRole("button", { name: "Générer" }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Aucune chaussure adaptée à la pluie.");
    expect(within(alert).getByRole("link", { name: "Ajouter un vêtement" })).toHaveAttribute("href", "/wardrobe/new");
  });

  it("ignores the weather once it is switched off", async () => {
    mockForecast(forecast({ rainMm: () => 1 }));
    const user = userEvent.setup();
    renderGenerator({
      garments: WARDROBE.map((g) => (g.category === "shoes" ? { ...g, rainOk: false } : g)),
    });
    await weatherReady();

    await user.click(screen.getByRole("switch", { name: "Tenir compte de la météo" }));
    expect(screen.getByText("Météo non prise en compte.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Générer" }));

    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("filters by occasion and names it when it blocks", async () => {
    mockForecast();
    const user = userEvent.setup();
    renderGenerator();
    await weatherReady();

    await user.click(screen.getByRole("radio", { name: "Travail" }));
    await user.click(screen.getByRole("radio", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "Générer" }));

    const [outfit] = screen.getAllByRole("article");
    expect(within(outfit!).getByText("Chemise")).toBeInTheDocument();
    expect(within(outfit!).getByText("Chino")).toBeInTheDocument();
    expect(within(outfit!).getByText("Derbies")).toBeInTheDocument();
  });

  it("rerolls a single outfit and keeps the others", async () => {
    mockForecast();
    const user = userEvent.setup();
    renderGenerator();
    await weatherReady();
    await user.click(screen.getByRole("button", { name: "Générer" }));

    const names = (article: HTMLElement) => within(article).getAllByRole("listitem").map((item) => item.textContent);
    const before = screen.getAllByRole("article").map(names);
    await user.click(screen.getByRole("button", { name: "Relancer la tenue 2" }));
    const after = screen.getAllByRole("article").map(names);

    expect(after[0]).toEqual(before[0]);
    expect(after[2]).toEqual(before[2]);
    expect(after[1]).not.toEqual(before[1]);
  });

  it("says when no other outfit exists for a reroll", async () => {
    mockForecast();
    const user = userEvent.setup();
    renderGenerator({ garments: [garment("T", "top"), garment("B", "bottom"), garment("S", "shoes")] });
    await weatherReady();
    await user.click(screen.getByRole("button", { name: "Générer" }));

    expect(screen.getByText("Une seule tenue possible avec ces filtres.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Relancer la tenue 1" }));
    expect(screen.getByText("Pas d'autre tenue possible avec ces filtres.")).toBeInTheDocument();
  });

  it("falls back to the default city when location is denied", async () => {
    mockGeolocation("denied");
    const requests = mockForecast();
    renderGenerator({ defaultCity: { name: "Lyon", latitude: 45.76, longitude: 4.84 } });

    expect(await weatherReady()).toHaveTextContent("Lyon");
    expect(requests[0]?.searchParams.get("latitude")).toBe("45.7600");
  });

  it("still generates without weather when no location is available", async () => {
    mockGeolocation("denied");
    const user = userEvent.setup();
    renderGenerator();

    expect(await screen.findByRole("alert")).toHaveTextContent("Définissez une ville par défaut dans les réglages.");
    await user.click(screen.getByRole("button", { name: "Générer" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("offers a retry when the weather service fails", async () => {
    server.use(http.get(FORECAST_URL, () => new HttpResponse(null, { status: 503 })));
    const user = userEvent.setup();
    renderGenerator();

    expect(await screen.findByRole("alert")).toHaveTextContent("Le service météo ne répond pas");
    mockForecast(forecast({ feelsLike: () => 18 }));
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await weatherReady()).toHaveTextContent("18°");
  });

  it("shows the whole day hour by hour in the weather detail", async () => {
    mockForecast(forecast({ feelsLike: (h) => h }));
    const user = userEvent.setup();
    renderGenerator();

    await user.click(await weatherReady());

    const dialog = await screen.findByRole("dialog", { name: "Météo du jour" });
    const table = within(dialog).getByRole("table", { name: "Prévisions heure par heure" });
    expect(within(table).getAllByRole("row")).toHaveLength(25);
    expect(within(table).getByRole("rowheader", { name: "07:00" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("00:00");
  });
});

describe("OutfitGenerator — resumed the next morning", () => {
  it("drops yesterday's outfits, whose photo links have expired", async () => {
    mockForecast();
    const user = userEvent.setup();
    renderGenerator();
    await weatherReady();
    await user.click(screen.getByRole("button", { name: "Générer" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);

    const now = Date.now();
    const spy = vi.spyOn(Date, "now").mockReturnValue(now);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    spy.mockReturnValue(now + 10 * 60 * 60 * 1000);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(await weatherReady()).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe("OutfitGenerator — empty wardrobe", () => {
  it("asks for a garment of the missing category", async () => {
    mockForecast();
    const user = userEvent.setup();
    renderGenerator({ garments: [] });
    await weatherReady();

    await user.click(screen.getByRole("button", { name: "Générer" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Ajoutez au moins un haut à votre garde-robe."),
    );
  });
});
