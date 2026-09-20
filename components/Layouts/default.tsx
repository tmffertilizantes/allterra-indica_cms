import NavbarVertical from "@components/Navbar/NavbarVertical";
import React from "react";
import router from "next/router";
import { useGlobal } from "@context/global";
import { Spinner } from "react-bootstrap";
import Logo from "@components/Logo";
import VersionTag from "@components/VersionTag";
import { logout } from "@context/user";

export interface LayoutProps {
  children: React.ReactNode;
  requireUserLoggedIn?: boolean;
}

export default function LayoutDefault({
  children,
  requireUserLoggedIn,
}: LayoutProps) {
  const { user = "", user_api_error = "" } = useGlobal();

  if (requireUserLoggedIn) {
    if (!user && user_api_error) {
      logout();
    }
  }

  return (
    <div className="layout-default">
      {user ? (
        <div id="db-wrapper">
          <NavbarVertical />

          <div id="page-content">{children}</div>
        </div>
      ) : (
        <div className="loader">
          <div className="logo">
            <Logo />
          </div>
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      <VersionTag />
    </div>
  );
}

LayoutDefault.defaultProps = {
  requireUserLoggedIn: true,
};
