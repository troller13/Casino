import React from "react";
import { CasinoPage } from "../components/casino/CasinoPage";

export function CasinoRoute() {
  return (
    <div
      style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 24px 48px" }}
    >
      <CasinoPage />
    </div>
  );
}
