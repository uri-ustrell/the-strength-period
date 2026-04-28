# QA-7 Faithful Presets Regeneration Report

Generated: 2026-04-28T13:03:26.212Z

- Source catalog: `data/ingestion/presets/catalog.json` (36 presets)
- Exercise catalog: `public/exercises/exercises.json` (130 total, 124 after dropping `pilates`)
- Dropped `pilates`-equipment exercise IDs: `Adductor`, `Ball_Leg_Curl`, `Calves-SMR`, `Lower_Back-SMR`, `Piriformis-SMR`, `Quadriceps-SMR`

## Per-preset summary

| # | Preset id | Archetype | Sessions A/B/C/D counts | weeks | Pilates-swapped (legacy ids removed) |
|---|---|---|---|---|---|
| 0 | `banda_elastica_cos_complet_v1` | band_strength | 6/6/6/6 | 6 | — |
| 1 | `banda_elastica_forca_progressiva_v1` | band_strength | 6/6/6/6 | 8 | — |
| 2 | `corredor_general` | runner_strength | 6/6/6/6 | 6 | — |
| 3 | `corredor_trail_excentric_baixades_v1` | rehab | 5/5/5/5 | 8 | — |
| 4 | `corredor_trail_pujada_forca_v1` | trail_climb | 6/5/6/5 | 8 | — |
| 5 | `embaras_1r_trimestre_v1` | embaras | 5/5/5/5 | 4 | — |
| 6 | `embaras_2n_trimestre_v1` | embaras | 5/5/5/5 | 6 | — |
| 7 | `embaras_3r_trimestre_v1` | embaras_late | 5/5/5/5 | 4 | — |
| 8 | `forca_general` | general_strength | 6/6/6/6 | 8 | — |
| 9 | `gent_gran_equilibri_mobilitat_v1` | elder_balance | 5/5/5/5 | 4 | — |
| 10 | `gent_gran_forca_manteniment_v1` | elder_strength | 5/5/5/5 | 8 | — |
| 11 | `gent_gran_funcional_v1` | elder_balance | 5/5/5/5 | 6 | — |
| 12 | `mobilitat_prevencio` | mobility | 6/6/6/6 | 4 | — |
| 13 | `mobilitat_toracica_espatlles_v1` | mobility | 6/6/6/6 | 4 | — |
| 14 | `mobilitat_tren_inferior_v1` | mobility | 6/6/6/6 | 4 | — |
| 15 | `postpart_corredora_general_v1` | postpart_return | 5/5/5/5 | 6 | — |
| 16 | `postpart_generator_core_strength_v1` | postpart_return | 5/5/5/5 | 6 | — |
| 17 | `postpart_rehab_conservative_v1` | postpart_rehab | 5/5/5/5 | 4 | — |
| 18 | `postpart_retorn_trail_v1` | trail_descent | 6/5/6/5 | 8 | — |
| 19 | `postpart_return_strength_v1` | postpart_return | 5/5/5/5 | 6 | — |
| 20 | `postpart_return_to_running_v1` | postpart_return | 5/5/5/5 | 8 | — |
| 21 | `principianta_descoberta_v1` | beginner_strength | 6/6/6/6 | 4 | — |
| 22 | `principianta_forca_base_v1` | beginner_strength | 6/6/6/6 | 6 | — |
| 23 | `principianta_forca_progressiva_v1` | beginner_strength | 6/6/6/6 | 8 | — |
| 24 | `pujada` | general_strength | 6/6/6/6 | 6 | — |
| 25 | `rehab_tendinitis_anserina` | rehab | 5/5/5/5 | 8 | — |
| 26 | `rutina_mobilitat_global_v1` | mobility | 6/6/6/6 | 4 | — |
| 27 | `tsp_descent_eccentric_linear_04` | trail_descent | 6/5/6/5 | 6 | — |
| 28 | `tsp_hybrid_all_terrain_undulating_05` | runner_strength | 6/6/6/6 | 6 | — |
| 29 | `tsp_lumbar_resilience_linear_06` | rehab | 5/5/5/5 | 4 | — |
| 30 | `tsp_road_foundation_linear_01` | runner_strength | 6/6/6/6 | 4 | — |
| 31 | `tsp_trail_stability_undulating_02` | runner_strength | 6/6/6/6 | 6 | — |
| 32 | `tsp_vertical_power_block_03` | trail_climb | 6/5/6/5 | 8 | — |
| 33 | `zero_descoberta_v1` | absolute_beginner | 5/5/5/5 | 4 | — |
| 34 | `zero_fonaments_setmana01_04_v1` | absolute_beginner | 5/5/5/5 | 4 | — |
| 35 | `zero_progressio_setmana05_10_v1` | absolute_beginner | 5/5/5/5 | 6 | — |

## Totals

- Presets regenerated: 36
- Total sessions: 144
- Total exercise entries: 788
- Warnings: 0
