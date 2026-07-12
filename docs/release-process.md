# Releaseproces

Een pull request wordt automatisch gevalideerd. Na review en merge naar `main` genereert de deployworkflow afgeleide databestanden, voert tests uit en publiceert Pages. Terugdraaien gebeurt via een revert-commit op `main`; de vorige geldige versie wordt daarna automatisch opnieuw gepubliceerd.
