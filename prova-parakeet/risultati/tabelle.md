### Tabella 1 — pagina di prova: tempi, memoria, scarico, precisione (5 frasi italiane, voce di sintesi)

| Browser | Motore · pesi | Thread | Backend | MB scaricati | Caricamento s | Memoria max (SO) MB | A freddo ms | Tempo medio ms | RTF | Encoder ms (medio) | Generazione ms (medio) | WER % | Punteggiatura % | Esito |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chromium | whisper-base | 1 | wasm | 76 | 8.3 | 1830 | 2654 | 2970 | 0.39 | 1809 | 1034 | 8.9 | 92.3 | ok |
| chromium | whisper-base | 2 | wasm | 76 | 1.0 | 1751 | 1775 | 2083 | 0.27 | 1111 | 844 | 8.9 | 92.3 | ok |
| chromium | whisper-base | 4 | wasm | 76 | 0.7 | 1971 | 1149 | 1509 | 0.20 | 652 | 728 | 8.9 | 92.3 | ok |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 199 | 15.5 | 1740 | 2347 | 3605 | 0.47 | 3511 | 81 | 5.1 | 76.9 | ok |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 199 | 1.6 | 1468 | 1354 | 2081 | 0.27 | 2013 | 58 | 5.1 | 76.9 | ok |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 199 | 1.1 | 1370 | 651 | 1161 | 0.15 | 1111 | 40 | 5.1 | 76.9 | ok |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 640 | 42.8 | 2564 | 999 | 1726 | 0.23 | 1645 | 70 | 3.8 | 84.6 | ok |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 640 | 3.2 | 2682 | 603 | 1050 | 0.14 | 989 | 48 | 3.8 | 84.6 | ok |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 640 | 2.7 | 2829 | 306 | 588 | 0.08 | 543 | 34 | 3.8 | 84.6 | ok |
| msedge | whisper-base | 1 | wasm | 79 | 6.3 | 2188 | 2709 | 2981 | 0.39 | 1843 | 1014 | 8.9 | 92.3 | ok |
| msedge | whisper-base | 2 | wasm | 79 | 1.0 | 2133 | 1858 | 2045 | 0.27 | 1090 | 831 | 8.9 | 92.3 | ok |
| msedge | whisper-base | 4 | wasm | 79 | 1.0 | 2503 | 1383 | 1587 | 0.21 | 730 | 729 | 8.9 | 92.3 | ok |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 199 | 16.0 | 1599 | 2281 | 3602 | 0.47 | 3506 | 84 | 5.1 | 76.9 | ok |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 199 | 1.6 | 1635 | 1315 | 2002 | 0.26 | 1935 | 56 | 5.1 | 76.9 | ok |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 199 | 1.2 | 2100 | 624 | 1143 | 0.15 | 1087 | 45 | 5.1 | 76.9 | ok |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 640 | 43.8 | 2893 | 981 | 1768 | 0.23 | 1682 | 74 | 3.8 | 84.6 | ok |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 640 | 3.2 | 3129 | 599 | 1034 | 0.14 | 972 | 51 | 3.8 | 84.6 | ok |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 640 | 3.1 | 3013 | 477 | 617 | 0.08 | 573 | 32 | 3.8 | 84.6 | ok |
| msedge | whisper-base | 1 | webgpu | 217 | 13.7 | 4816 | 3647 | 2370 | 0.31 | 555 | 1670 | 6.3 | 92.3 | ok |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 0 | 1.7 | 2979 | 3054 | 2368 | 0.31 | 1093 | 1220 | 100.0 | 0.0 | ok |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 0 | 3.6 | 3714 | 3287 | 5030 | 0.66 | 2351 | 2659 | 100.0 | 0.0 | ok |
| webkit + coi-serviceworker | whisper-base | 1 | wasm | 99 | 6.2 | 4468 | 2809 | 3021 | 0.40 | 1832 | 1003 | 8.9 | 92.3 | ok |
| webkit + coi-serviceworker | whisper-base | 2 | wasm | 99 | 0.0 | 536 | n/d | — | — | — | — | — | — | Error: errore del lavoratore |
| webkit (senza isolamento) | whisper-base | 1 | wasm | 99 | 6.3 | 2409 | 2769 | 3038 | 0.40 | 1848 | 999 | 8.9 | 92.3 | ok |
| webkit (senza isolamento) | parakeet-olicorne-w2a8 | 1 | wasm | 199 | 18.1 | 1845 | 2439 | 3790 | 0.50 | 3657 | 121 | 5.1 | 76.9 | ok |
| webkit (senza isolamento) | parakeet-istupakov-int8 | 1 | wasm | 640 | 50.6 | 3305 | 1004 | 1853 | 0.24 | 1736 | 105 | 3.8 | 84.6 | ok |

### Tabella 2 — per frase (ms), configurazioni riuscite

| Browser | Motore | Thread | Backend | Frase | Audio s | Preparazione | Encoder | Generazione | Totale |
|---|---|---|---|---|---|---|---|---|---|
| chromium | whisper-base | 1 | wasm | 1 | 4.1 | 116 | 1814 | 554 | 2498 |
| chromium | whisper-base | 1 | wasm | 2 | 3.6 | 111 | 1862 | 539 | 2525 |
| chromium | whisper-base | 1 | wasm | 3 | 8.4 | 115 | 1785 | 1101 | 3019 |
| chromium | whisper-base | 1 | wasm | 4 | 7.9 | 106 | 1799 | 1100 | 3017 |
| chromium | whisper-base | 1 | wasm | 5 | 14.2 | 106 | 1784 | 1874 | 3790 |
| chromium | whisper-base | 2 | wasm | 1 | 4.1 | 115 | 1113 | 440 | 1682 |
| chromium | whisper-base | 2 | wasm | 2 | 3.6 | 107 | 1114 | 432 | 1665 |
| chromium | whisper-base | 2 | wasm | 3 | 8.4 | 115 | 1115 | 921 | 2169 |
| chromium | whisper-base | 2 | wasm | 4 | 7.9 | 107 | 1109 | 890 | 2123 |
| chromium | whisper-base | 2 | wasm | 5 | 14.2 | 104 | 1106 | 1537 | 2773 |
| chromium | whisper-base | 4 | wasm | 1 | 4.1 | 120 | 655 | 364 | 1151 |
| chromium | whisper-base | 4 | wasm | 2 | 3.6 | 109 | 639 | 375 | 1135 |
| chromium | whisper-base | 4 | wasm | 3 | 8.4 | 125 | 650 | 778 | 1571 |
| chromium | whisper-base | 4 | wasm | 4 | 7.9 | 101 | 658 | 780 | 1556 |
| chromium | whisper-base | 4 | wasm | 5 | 14.2 | 105 | 659 | 1342 | 2132 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 1 | 4.1 | 6 | 2302 | 47 | 2355 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 2 | 3.6 | 6 | 2080 | 43 | 2130 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 3 | 8.4 | 13 | 3795 | 94 | 3902 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 4 | 7.9 | 14 | 3547 | 84 | 3646 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 5 | 14.2 | 19 | 5832 | 138 | 5990 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 1 | 4.1 | 6 | 1307 | 31 | 1344 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 2 | 3.6 | 7 | 1196 | 28 | 1232 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 3 | 8.4 | 10 | 2198 | 62 | 2271 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 4 | 7.9 | 12 | 2062 | 60 | 2135 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 5 | 14.2 | 18 | 3299 | 108 | 3425 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 1 | 4.1 | 5 | 695 | 21 | 722 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 2 | 3.6 | 5 | 624 | 19 | 649 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 3 | 8.4 | 10 | 1160 | 54 | 1224 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 4 | 7.9 | 11 | 1235 | 37 | 1283 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 5 | 14.2 | 17 | 1842 | 67 | 1926 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 1 | 4.1 | 8 | 945 | 37 | 991 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 2 | 3.6 | 5 | 797 | 29 | 831 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 3 | 8.4 | 12 | 1786 | 72 | 1870 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 4 | 7.9 | 11 | 1687 | 72 | 1770 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 5 | 14.2 | 18 | 3009 | 138 | 3165 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 1 | 4.1 | 6 | 595 | 21 | 624 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 2 | 3.6 | 5 | 492 | 24 | 520 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 3 | 8.4 | 11 | 1061 | 49 | 1122 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 4 | 7.9 | 11 | 1017 | 51 | 1079 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 5 | 14.2 | 29 | 1779 | 97 | 1905 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 1 | 4.1 | 6 | 301 | 16 | 325 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 2 | 3.6 | 5 | 276 | 14 | 297 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 3 | 8.4 | 12 | 608 | 36 | 656 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 4 | 7.9 | 12 | 548 | 33 | 594 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 5 | 14.2 | 18 | 980 | 69 | 1067 |
| msedge | whisper-base | 1 | wasm | 1 | 4.1 | 118 | 1838 | 547 | 2518 |
| msedge | whisper-base | 1 | wasm | 2 | 3.6 | 106 | 1882 | 537 | 2531 |
| msedge | whisper-base | 1 | wasm | 3 | 8.4 | 108 | 1850 | 1078 | 3053 |
| msedge | whisper-base | 1 | wasm | 4 | 7.9 | 106 | 1812 | 1067 | 3000 |
| msedge | whisper-base | 1 | wasm | 5 | 14.2 | 103 | 1834 | 1843 | 3804 |
| msedge | whisper-base | 2 | wasm | 1 | 4.1 | 128 | 1098 | 432 | 1670 |
| msedge | whisper-base | 2 | wasm | 2 | 3.6 | 107 | 1077 | 422 | 1613 |
| msedge | whisper-base | 2 | wasm | 3 | 8.4 | 102 | 1099 | 901 | 2122 |
| msedge | whisper-base | 2 | wasm | 4 | 7.9 | 102 | 1088 | 878 | 2082 |
| msedge | whisper-base | 2 | wasm | 5 | 14.2 | 104 | 1088 | 1521 | 2738 |
| msedge | whisper-base | 4 | wasm | 1 | 4.1 | 122 | 615 | 366 | 1115 |
| msedge | whisper-base | 4 | wasm | 2 | 3.6 | 114 | 643 | 353 | 1117 |
| msedge | whisper-base | 4 | wasm | 3 | 8.4 | 104 | 777 | 804 | 1703 |
| msedge | whisper-base | 4 | wasm | 4 | 7.9 | 117 | 806 | 768 | 1703 |
| msedge | whisper-base | 4 | wasm | 5 | 14.2 | 107 | 811 | 1356 | 2297 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 1 | 4.1 | 6 | 2268 | 45 | 2320 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 2 | 3.6 | 8 | 2092 | 42 | 2143 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 3 | 8.4 | 12 | 3744 | 101 | 3858 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 4 | 7.9 | 14 | 3518 | 81 | 3614 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 5 | 14.2 | 18 | 5906 | 150 | 6075 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 1 | 4.1 | 6 | 1246 | 32 | 1284 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 2 | 3.6 | 5 | 1151 | 29 | 1186 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 3 | 8.4 | 13 | 2101 | 65 | 2179 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 4 | 7.9 | 12 | 1959 | 59 | 2031 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 5 | 14.2 | 21 | 3216 | 93 | 3332 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 1 | 4.1 | 6 | 769 | 24 | 799 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 2 | 3.6 | 5 | 612 | 21 | 639 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 3 | 8.4 | 10 | 1154 | 51 | 1217 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 4 | 7.9 | 11 | 1060 | 44 | 1115 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 5 | 14.2 | 19 | 1837 | 88 | 1945 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 1 | 4.1 | 7 | 992 | 38 | 1038 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 2 | 3.6 | 8 | 798 | 29 | 835 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 3 | 8.4 | 13 | 1818 | 77 | 1908 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 4 | 7.9 | 13 | 1756 | 78 | 1848 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 5 | 14.2 | 21 | 3046 | 146 | 3213 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 1 | 4.1 | 7 | 591 | 38 | 636 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 2 | 3.6 | 5 | 481 | 22 | 508 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 3 | 8.4 | 11 | 1058 | 53 | 1122 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 4 | 7.9 | 12 | 989 | 55 | 1056 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 5 | 14.2 | 17 | 1741 | 89 | 1848 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 1 | 4.1 | 7 | 365 | 24 | 396 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 2 | 3.6 | 9 | 422 | 15 | 446 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 3 | 8.4 | 12 | 576 | 35 | 624 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 4 | 7.9 | 11 | 542 | 34 | 588 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 5 | 14.2 | 17 | 960 | 54 | 1031 |
| msedge | whisper-base | 1 | webgpu | 1 | 4.1 | 141 | 584 | 880 | 1618 |
| msedge | whisper-base | 1 | webgpu | 2 | 3.6 | 131 | 536 | 799 | 1477 |
| msedge | whisper-base | 1 | webgpu | 3 | 8.4 | 120 | 535 | 1853 | 2527 |
| msedge | whisper-base | 1 | webgpu | 4 | 7.9 | 117 | 563 | 1701 | 2397 |
| msedge | whisper-base | 1 | webgpu | 5 | 14.2 | 128 | 557 | 3117 | 3831 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 1 | 4.1 | 173 | 725 | 623 | 1524 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 2 | 3.6 | 11 | 467 | 604 | 1083 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 3 | 8.4 | 19 | 1083 | 1362 | 2465 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 4 | 7.9 | 19 | 924 | 1228 | 2172 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 5 | 14.2 | 47 | 2267 | 2280 | 4595 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 1 | 4.1 | 16 | 1618 | 1527 | 3165 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 2 | 3.6 | 12 | 1471 | 1262 | 2746 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 3 | 8.4 | 20 | 2537 | 3145 | 5705 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 4 | 7.9 | 18 | 2441 | 2720 | 5180 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 5 | 14.2 | 24 | 3690 | 4639 | 8355 |
| webkit | whisper-base | 1 | wasm | 1 | 4.1 | 176 | 1807 | 537 | 2528 |
| webkit | whisper-base | 1 | wasm | 2 | 3.6 | 174 | 1864 | 540 | 2585 |
| webkit | whisper-base | 1 | wasm | 3 | 8.4 | 172 | 1882 | 1087 | 3156 |
| webkit | whisper-base | 1 | wasm | 4 | 7.9 | 175 | 1853 | 1080 | 3122 |
| webkit | whisper-base | 1 | wasm | 5 | 14.2 | 167 | 1752 | 1772 | 3712 |
| webkit | whisper-base | 1 | wasm | 1 | 4.1 | 182 | 1813 | 533 | 2536 |
| webkit | whisper-base | 1 | wasm | 2 | 3.6 | 187 | 1910 | 535 | 2639 |
| webkit | whisper-base | 1 | wasm | 3 | 8.4 | 178 | 1866 | 1063 | 3118 |
| webkit | whisper-base | 1 | wasm | 4 | 7.9 | 172 | 1816 | 1085 | 3095 |
| webkit | whisper-base | 1 | wasm | 5 | 14.2 | 169 | 1836 | 1778 | 3804 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 1 | 4.1 | 6 | 2464 | 70 | 2540 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 2 | 3.6 | 5 | 2176 | 65 | 2246 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 3 | 8.4 | 11 | 3925 | 134 | 4071 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 4 | 7.9 | 13 | 3705 | 128 | 3847 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 5 | 14.2 | 22 | 6017 | 206 | 6246 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 1 | 4.1 | 11 | 1031 | 56 | 1101 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 2 | 3.6 | 5 | 848 | 49 | 904 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 3 | 8.4 | 11 | 1900 | 134 | 2046 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 4 | 7.9 | 10 | 1761 | 107 | 1878 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 5 | 14.2 | 19 | 3140 | 177 | 3336 |

### Tabella 3 — testo prodotto (primo browser che ha finito la configurazione, 1 thread)

| Motore · pesi | Frase | Testo riconosciuto | WER % |
|---|---|---|---|
| whisper-base | 1 | Buongiorno, vorrei prenotare un tavolo. | 0.0 |
| whisper-base | 2 | Domani piuve, porta l'ombrello. | 25.0 |
| whisper-base | 3 | Ieri sera abbiamo cenato in un ristorante vicino al mare, e il camerai regentile ci ha consigliato il pesce fresco. | 10.0 |
| whisper-base | 4 | Il treno per Roma parte alle nove e quarenta dal binario sette, non dimenticare i billeti e il passaporto. | 10.5 |
| whisper-base | 5 | Gentile cliente, la informiamo che il suo ordine è stato spedito questa mattina e arriverà entre tre giorni lavorativi, se desiderà cambiare l'indirizzo di consegna, ci contatti al più presto, grazie. | 6.5 |
| parakeet-olicorne-w2a8 | 1 | Buongiorno, vorrei prenotare un tavolo | 0.0 |
| parakeet-olicorne-w2a8 | 2 | Domani piove, porta l'ombrello | 0.0 |
| parakeet-olicorne-w2a8 | 3 | Ieri sera abbiamo cenato in un ristorante vicino al mare, e il cameriere gentile ci ha consigliato il pesce fresco. | 0.0 |
| parakeet-olicorne-w2a8 | 4 | Il treno per Roma parte alle 9.40 dal binario 7, non dimenticare i biglietti e il passaporto. | 21.1 |
| parakeet-olicorne-w2a8 | 5 | Gentile cliente, la informiamo che il suo ordine è stato spedito questa mattina e arriverà entro tre giorni lavorativi, se desidera cambiare l'indirizzo di consegna, ci contatti al più presto, grazie. | 0.0 |
| parakeet-istupakov-int8 | 1 | Buongiorno, vorrei prenotare un tavolo. | 0.0 |
| parakeet-istupakov-int8 | 2 | Domani piove, porta l'ombrello. | 0.0 |
| parakeet-istupakov-int8 | 3 | Ieri sera abbiamo cenato in un ristorante vicino al mare, e il cameriere Gentile ci ha consigliato il pesce fresco. | 0.0 |
| parakeet-istupakov-int8 | 4 | Il treno per Roma parte alle 9 e 40 dal binario 7. Non dimenticare i biglietti e il passaporto. | 15.8 |
| parakeet-istupakov-int8 | 5 | Gentile cliente, la informiamo che il suo ordine è stato spedito questa mattina e arriverà entro tre giorni lavorativi. Se desidera cambiare l'indirizzo di consegna, ci contatti al più presto, grazie. | 0.0 |

### Dispositivi / browser provati

- **chromium**: userAgent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/158.0.8127.18 Safari/537.36 · platform=Windows · cores=22 · deviceMemoryGB=16 · crossOriginIsolated=true · sharedArrayBuffer=true · webgpu=true · platformVersion=19.0.0 · architecture=x86 · webgpuAdapter=nessun adattatore
- **msedge**: userAgent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0 · platform=Windows · cores=22 · deviceMemoryGB=16 · crossOriginIsolated=true · sharedArrayBuffer=true · webgpu=true · platformVersion=19.0.0 · architecture=x86 · webgpuAdapter=intel / xe-lpg
- **webkit**: userAgent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15 · platform=Win32 · cores=8 · crossOriginIsolated=true · sharedArrayBuffer=true · webgpu=false
- **webkit**: userAgent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15 · platform=Win32 · cores=8 · crossOriginIsolated=false · sharedArrayBuffer=false · webgpu=false

### Pausa che chiude la frase — solo il segmentatore (audio con 6 pause interne: 350, 450, 500, 600, 650, 800 ms)

| silenceMs | Frasi emesse / volute | Tagliate a metà | Ritardo medio ms |
|---|---|---|---|
| 400 | 12 / 6 | 6 | 426 |
| 550 | 9 / 6 | 3 | 586 |
| 700 | 7 / 6 | 1 | 725 |

### Tabella 4 — dentro l'app (build di prova, Whisper base, microfono finto con le 5 frasi di fila): dove va il tempo, in ms

| Prova | Frasi | Isolata | Attesa pausa | Preparazione | Coda | Log-mel | Encoder | Generazione | Ritorno | Schermo | **Totale (fine voce → schermo)** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| app-chromium-base-r1 | 5 | true | 724 | 6 | 0 | 122 | 1894 | 1048 | 0 | 4 | **3811** |
| app-chromium-base-r2 | 5 | true | 686 | 7 | 0 | 119 | 1867 | 1043 | 0 | 9 | **3743** |
| app-chromium-threads2 | 5 | true | 688 | 6 | 0 | 117 | 1124 | 848 | 0 | 11 | **2806** |
| app-chromium-threads4 | 5 | true | 632 | 6 | 0 | 120 | 645 | 731 | 0 | 14 | **2161** |
| app-chromium-webgpu | 0 | true | — | — | — | — | — | — | — | — | TimeoutError: locator.waitFor: Timeout 240000ms exceeded.
Call log:
[2m  - waiting for getByText('Ti ascolto…') to be visible[22m
 |
| app-msedge-base | 5 | true | 632 | 6 | 0 | 134 | 1922 | 1042 | 0 | 7 | **3756** |
| app-msedge-threads4 | 4 | true | 720 | 4 | 0 | 135 | 696 | 589 | 0 | 15 | **2171** |

### Tabella 5 — pausa che chiude la frase (silenceMs) nell'app, con Whisper vero (audio con 6 pause interne di 350–800 ms)

| silenceMs | Frasi in uscita (6 volute) | Tagliate a metà | Attesa pausa media ms | Totale medio ms | Testo in uscita (una frase per ¦) |
|---|---|---|---|---|---|
| 400 | 12 | 6 | 355 | 5801 | Per favore. ¦ chiudi la finestra della cucina. ¦ Do manima tina ¦ devo portare la macchina dal meccanico. ¦ Volei un caffè. ¦ senza zucchero ¦ Mi assurella arriva al 16. ¦ con i bambini ¦ Il libro che mi ha prestato. ¦ è davvero bellissimo! ¦ Telefon ammistacera ¦ dopodina |
| 550 | 10 | 4 | 502 | 3210 | Per favore, chiudi la finestra della cucina. ¦ Domani mattina, devo portare la macchina dal mecanico. ¦ Volei un caffè ¦ senza zupiro. ¦ Mi assurella arriva al le 6. ¦ con i bambini. ¦ il libro che mi ha prestato ¦ è davvero bellissimo! ¦ Telefon amista sera ¦ no, potevete. |
| 700 | 7 | 1 | 703 | 3294 | Per favore, chiudi la finestra della cucina. ¦ Domani mattina, devo portare la macchina dal mecanico. ¦ vorrei un caffè senza zucchero ¦ Mi assorella arriva alle 6 con i bambini. ¦ il libro che mi hai prestato è davvero bellissimo ¦ Telefon amista sera ¦ dopodina. |

