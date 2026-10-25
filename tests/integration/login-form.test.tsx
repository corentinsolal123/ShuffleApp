import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { LoginForm } from "@/components/auth/login-form";
import { routerMock } from "@/tests/mocks/router";
import { SUPABASE_URL, server } from "@/tests/msw/server";
import { authHandlers } from "@/tests/msw/supabase-auth";

const EMAIL = "moi@exemple.fr";

async function requestCode() {
  const user = userEvent.setup();
  render(<LoginForm />);
  await user.type(screen.getByLabelText("Email"), EMAIL);
  await user.click(screen.getByRole("button", { name: "Recevoir un code" }));
  return user;
}

describe("LoginForm", () => {
  it("disables the submit button until the email looks valid", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const submit = screen.getByRole("button", { name: "Recevoir un code" });

    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("Email"), EMAIL);
    expect(submit).toBeEnabled();
  });

  it("asks for the code once the email has been sent", async () => {
    server.use(authHandlers.otpSent());
    await requestCode();

    expect(await screen.findByText(`Envoyé à ${EMAIL}`)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Code reçu par email" })).toBeInTheDocument();
  });

  it("shows a clear message when the email rate limit is hit", async () => {
    server.use(authHandlers.otpRateLimited());
    await requestCode();

    expect(await screen.findByRole("alert")).toHaveTextContent("Trop de tentatives");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("explains that the address has not been invited", async () => {
    server.use(authHandlers.otpNotInvited());
    await requestCode();

    expect(await screen.findByRole("alert")).toHaveTextContent("Cette adresse n'a pas été invitée.");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("signs in and goes home when the 6-digit code is valid", async () => {
    server.use(authHandlers.otpSent(), authHandlers.verifySucceeds(EMAIL));
    const user = await requestCode();

    await user.click(await screen.findByRole("textbox", { name: "Code reçu par email" }));
    await user.keyboard("123456");

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/"));
    expect(routerMock.refresh).toHaveBeenCalled();
  });

  it("clears the code and shows an error when the code is rejected", async () => {
    server.use(authHandlers.otpSent(), authHandlers.verifyRejects());
    const user = await requestCode();

    await user.click(await screen.findByRole("textbox", { name: "Code reçu par email" }));
    await user.keyboard("000000");

    expect(await screen.findByRole("alert")).toHaveTextContent("Code invalide ou expiré.");
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeDisabled();
  });

  it("recovers when the network is down", async () => {
    server.use(http.post(`${SUPABASE_URL}/auth/v1/otp`, () => HttpResponse.error()));
    await requestCode();

    expect(await screen.findByRole("alert")).toHaveTextContent("Une erreur est survenue");
    expect(screen.getByRole("button", { name: "Recevoir un code" })).toBeEnabled();
  });

  it("goes back to the email step", async () => {
    server.use(authHandlers.otpSent());
    const user = await requestCode();

    await user.click(await screen.findByRole("button", { name: "Changer d'email" }));

    expect(screen.getByLabelText("Email")).toHaveValue(EMAIL);
  });
});
