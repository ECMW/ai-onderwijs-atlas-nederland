# Releaseproces

Een pull request wordt automatisch gevalideerd. De door de eigenaar gemachtigde dagelijkse
Atlas-actualisator mag uitsluitend haar eigen volledig geverifieerde PR na alle verplichte groene checks
zelfstandig naar `main` mergen. Externe bijdragen en reviewvoorstellen vereisen menselijke beoordeling.

Na merge naar `main` genereert de deployworkflow afgeleide databestanden, voert tests uit en publiceert
Pages. De actualisator controleert daarna de deployment en live zoekbaarheid. Terugdraaien gebeurt via een
revert-commit op `main`; de vorige geldige versie wordt daarna automatisch opnieuw gepubliceerd.
