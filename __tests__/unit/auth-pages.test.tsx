import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Mock auth client
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn().mockResolvedValue({ data: null, error: null }) },
    signUp: { email: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import AuthLayout from "@/app/(auth)/layout";

describe("LoginForm", () => {
  it('displays engagement copy with "Welcome back"', () => {
    render(<LoginForm />);
    const engagementCopy = screen.getByTestId("auth-engagement-copy");
    expect(engagementCopy).toBeDefined();
    expect(engagementCopy.textContent).toContain("Welcome back");
  });

  it("all input elements have min-h-[44px] touch target class", () => {
    const { container } = render(<LoginForm />);
    const inputs = container.querySelectorAll('input[data-slot="input"]');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => {
      expect(input.className).toContain("min-h-[44px]");
    });
  });

  it("submit button has min-h-[44px] touch target class", () => {
    render(<LoginForm />);
    const button = screen.getByRole("button", { name: /sign in/i });
    expect(button.className).toContain("min-h-[44px]");
  });
});

describe("RegisterForm", () => {
  it('displays engagement copy with "Create your account"', () => {
    render(<RegisterForm />);
    const engagementCopy = screen.getByTestId("auth-engagement-copy");
    expect(engagementCopy).toBeDefined();
    expect(engagementCopy.textContent).toContain("Create your account");
  });

  it("all input elements have min-h-[44px] touch target class", () => {
    const { container } = render(<RegisterForm />);
    const inputs = container.querySelectorAll('input[data-slot="input"]');
    expect(inputs.length).toBeGreaterThan(0);
    inputs.forEach((input) => {
      expect(input.className).toContain("min-h-[44px]");
    });
  });

  it("submit button has min-h-[44px] touch target class", () => {
    render(<RegisterForm />);
    const button = screen.getByRole("button", { name: /register/i });
    expect(button.className).toContain("min-h-[44px]");
  });
});

describe("AuthLayout", () => {
  it("renders the illustration panel", () => {
    render(
      <AuthLayout>
        <div>Test Form</div>
      </AuthLayout>
    );
    const illustrationPanel = screen.getByTestId("auth-illustration-panel");
    expect(illustrationPanel).toBeDefined();
    // Should contain an SVG illustration
    const svg = illustrationPanel.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders the form panel", () => {
    render(
      <AuthLayout>
        <div>Test Form</div>
      </AuthLayout>
    );
    const formPanel = screen.getByTestId("auth-form-panel");
    expect(formPanel).toBeDefined();
    expect(formPanel.textContent).toContain("Test Form");
  });
});
