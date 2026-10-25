import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOccasion,
  deleteOccasion,
  inviteEmail,
  renameOccasion,
  revokeInvitation,
  saveDefaultCity,
} from "@/app/(app)/settings/actions";
import { CitySetting } from "@/components/settings/city-setting";
import { InstallHint } from "@/components/settings/install-hint";
import { InvitationsManager } from "@/components/settings/invitations-manager";
import { OccasionsManager } from "@/components/settings/occasions-manager";
import type { OccasionWithUsage } from "@/lib/occasions/model";
import { server } from "@/tests/msw/server";

vi.mock("@/app/(app)/settings/actions", () => ({
  saveDefaultCity: vi.fn(),
  createOccasion: vi.fn(),
  renameOccasion: vi.fn(),
  deleteOccasion: vi.fn(),
  inviteEmail: vi.fn(),
  revokeInvitation: vi.fn(),
}));

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

afterEach(() => {
  vi.mocked(saveDefaultCity).mockReset();
  vi.mocked(createOccasion).mockReset();
  vi.mocked(renameOccasion).mockReset();
  vi.mocked(deleteOccasion).mockReset();
  vi.mocked(inviteEmail).mockReset();
  vi.mocked(revokeInvitation).mockReset();
});

describe("CitySetting", () => {
  function geocodingReturns(results: unknown[]) {
    server.use(http.get(GEOCODING_URL, () => HttpResponse.json({ results })));
  }

  it("searches a city and saves the chosen one", async () => {
    geocodingReturns([
      { id: 1, name: "Lyon", latitude: 45.75, longitude: 4.85, admin1: "Auvergne-Rhône-Alpes", country: "France" },
    ]);
    vi.mocked(saveDefaultCity).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<CitySetting city={null} />);

    expect(screen.getByText("Aucune ville définie.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Rechercher une ville"), "Lyon");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));
    await user.click(await screen.findByRole("button", { name: /Lyon\s*Auvergne-Rhône-Alpes, France/ }));

    await waitFor(() =>
      expect(saveDefaultCity).toHaveBeenCalledWith(expect.objectContaining({ name: "Lyon", latitude: 45.75, longitude: 4.85 })),
    );
    expect(screen.queryByRole("list", { name: "Résultats" })).not.toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    geocodingReturns([]);
    const user = userEvent.setup();
    render(<CitySetting city={null} />);

    await user.type(screen.getByLabelText("Rechercher une ville"), "Xyzzy");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Aucune ville trouvée.");
  });

  it("explains a search failure", async () => {
    server.use(http.get(GEOCODING_URL, () => new HttpResponse(null, { status: 502 })));
    const user = userEvent.setup();
    render(<CitySetting city={null} />);

    await user.type(screen.getByLabelText("Rechercher une ville"), "Lyon");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ne répond pas");
  });

  it("removes the current city", async () => {
    vi.mocked(saveDefaultCity).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<CitySetting city={{ name: "Lyon", latitude: 45.75, longitude: 4.85 }} />);

    expect(screen.getByText("Lyon")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retirer" }));

    expect(saveDefaultCity).toHaveBeenCalledWith(null);
  });
});

describe("OccasionsManager", () => {
  const OCCASIONS: OccasionWithUsage[] = [
    { id: "daily", name: "Quotidien", garmentCount: 4, soleGarmentCount: 0 },
    { id: "work", name: "Travail", garmentCount: 3, soleGarmentCount: 2 },
    { id: "party", name: "Soirée", garmentCount: 0, soleGarmentCount: 0 },
  ];

  it("lists occasions with their usage", () => {
    render(<OccasionsManager occasions={OCCASIONS} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows[1]).toHaveTextContent("Travail3 vêtements");
    expect(rows[2]).toHaveTextContent("Aucun vêtement");
  });

  it("adds an occasion and reports duplicates", async () => {
    vi.mocked(createOccasion).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({
      ok: false,
      error: "Cette occasion existe déjà.",
    });
    const user = userEvent.setup();
    render(<OccasionsManager occasions={OCCASIONS} />);

    const input = screen.getByLabelText("Nouvelle occasion");
    await user.type(input, "Plage");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() => expect(input).toHaveValue(""));
    expect(createOccasion).toHaveBeenCalledWith("Plage");

    await user.type(input, "travail");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cette occasion existe déjà.");
  });

  it("renames an occasion inline", async () => {
    vi.mocked(renameOccasion).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<OccasionsManager occasions={OCCASIONS} />);

    await user.click(screen.getByRole("button", { name: "Renommer Soirée" }));
    const input = screen.getByLabelText("Nouveau nom pour Soirée");
    await user.clear(input);
    await user.type(input, "Sortie");
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(renameOccasion).toHaveBeenCalledWith("party", "Sortie");
    await waitFor(() => expect(screen.queryByLabelText("Nouveau nom pour Soirée")).not.toBeInTheDocument());
  });

  it("deletes an occasion that no garment depends on", async () => {
    vi.mocked(deleteOccasion).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<OccasionsManager occasions={OCCASIONS} />);

    await user.click(screen.getByRole("button", { name: "Supprimer Soirée" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Elle sera retirée des vêtements qui l'utilisent.");
    expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(deleteOccasion).toHaveBeenCalledWith("party", null);
  });

  it("asks for a replacement when garments only have this occasion", async () => {
    vi.mocked(deleteOccasion).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<OccasionsManager occasions={OCCASIONS} />);

    await user.click(screen.getByRole("button", { name: "Supprimer Travail" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("2 vêtements n'ont que cette occasion.");
    await user.click(within(dialog).getByRole("radio", { name: "Soirée" }));
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(deleteOccasion).toHaveBeenCalledWith("work", "party");
  });

  it("shows a refused deletion inside the dialog", async () => {
    vi.mocked(deleteOccasion).mockResolvedValue({ ok: false, error: "Suppression impossible. Réessayez." });
    const user = userEvent.setup();
    render(<OccasionsManager occasions={OCCASIONS} />);

    await user.click(screen.getByRole("button", { name: "Supprimer Soirée" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Suppression impossible");
  });

  it("keeps the last occasion", () => {
    render(<OccasionsManager occasions={[OCCASIONS[0]!]} />);
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeDisabled();
  });
});

describe("InstallHint", () => {
  afterEach(() => vi.restoreAllMocks());

  function setDisplayMode(standalone: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: standalone,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }

  it("is hidden when the app already runs installed", () => {
    setDisplayMode(true);
    render(<InstallHint />);
    expect(screen.queryByText("Installer l'application")).not.toBeInTheDocument();
  });

  it("explains the iOS steps in Safari", () => {
    setDisplayMode(false);
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
    );
    render(<InstallHint />);

    expect(screen.getByText("Installer l'application")).toBeInTheDocument();
    expect(screen.getByText("Sur l'écran d'accueil")).toBeInTheDocument();
  });
});

describe("InvitationsManager", () => {
  const invitations = [
    { email: "ami@exemple.fr", createdAt: "2026-10-20T10:00:00Z", acceptedAt: null },
    { email: "soeur@exemple.fr", createdAt: "2026-10-18T10:00:00Z", acceptedAt: "2026-10-19T08:00:00Z" },
  ];

  it("shows who is still pending and who has signed up", () => {
    render(<InvitationsManager invitations={invitations} />);

    const [pending, accepted] = screen.getAllByRole("listitem");
    expect(pending).toHaveTextContent("En attente · invité le 20 oct.");
    expect(accepted).toHaveTextContent("Inscrit le 19 oct.");
    expect(within(accepted!).queryByRole("button")).not.toBeInTheDocument();
  });

  it("invites an address and clears the field", async () => {
    vi.mocked(inviteEmail).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<InvitationsManager invitations={[]} />);

    await user.type(screen.getByLabelText("Adresse à inviter"), "nouveau@exemple.fr");
    await user.click(screen.getByRole("button", { name: "Inviter" }));

    expect(inviteEmail).toHaveBeenCalledWith("nouveau@exemple.fr");
    await waitFor(() => expect(screen.getByLabelText("Adresse à inviter")).toHaveValue(""));
  });

  it("shows the error returned by the server", async () => {
    vi.mocked(inviteEmail).mockResolvedValue({ ok: false, error: "Cette adresse est déjà invitée." });
    const user = userEvent.setup();
    render(<InvitationsManager invitations={[]} />);

    await user.type(screen.getByLabelText("Adresse à inviter"), "ami@exemple.fr");
    await user.click(screen.getByRole("button", { name: "Inviter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cette adresse est déjà invitée.");
  });

  it("cancels a pending invitation", async () => {
    vi.mocked(revokeInvitation).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<InvitationsManager invitations={invitations} />);

    await user.click(screen.getByRole("button", { name: "Annuler l'invitation de ami@exemple.fr" }));

    expect(revokeInvitation).toHaveBeenCalledWith("ami@exemple.fr");
  });
});
