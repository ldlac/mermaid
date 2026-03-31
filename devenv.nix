{ pkgs, lib, config, inputs, ... }:

{
  packages = [
    pkgs.pnpm_10
    pkgs.nodejs_22
    pkgs.trivy
  ];

  dotenv.disableHint = true;

  enterShell = ''
  '';

  enterTest = ''
  '';
}