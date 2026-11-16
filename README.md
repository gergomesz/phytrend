# PhyTrend v1.0.0 - Phytoplankton Process and Volcanic Rupture (MODIS-Aqua Ocean Colour, 2002-2025)

Advantage Team Members - Gergo Meszaros & Hassan Khan (University of Toronto) 

## Project Links
* **Project Demonstration:** [Video Link](https://drive.google.com/file/d/1SjyGyUoD61s7dDPLN5h4QfyPzpiP0n6q/view?usp=sharing)
* **Live Project:** [https://phytrend.earth](https://phytrend.earth)
- Video Audio [https://www.epidemicsound.com/music/tracks/a2ec6d8d-c8ea-457c-a3f3-56bb8c53cb18/]

## Summary
Phytoplankton are the cornerstones of life on Earth, accounting for approximately half of the oxygen in our atmosphere; ergo, understanding their response to climate forcing is of paramount importance, but this can only be accounted for if we evaluate volcanic perturbations. PhyTrend is an interactive visualizer of phytoplankton effects that quantifies localized environmental changes to determine whether they are attributable to episodic volcanic events or represent climatic trends that are statistically significant {p < 0.05}. Apropos of the ESTD challenge, the platform utilizes user-uploaded Giovanni time series data {MODIS-Aqua chlorophyll and sea surface temperature in accompaniment with the built inNSIDC Sea Ice Index} to isolate climate signals by deseasonalizing the data, fitting linear decadal trends and applying the Mann-Kendall test for statistical significance. Contemporaneously, it cross-references the existent anomalies with the MSVOLSO(2)L4 database to track the forcing derived from historical eruptions - attributing specific biological spikes combined across four eruptions with exceptional significance (p ≈ 0.008). By contrasting opposing ecological outcomes {case in point, the North Pacific Gyre and the Chukchi Sea exhibited a vastly different decade-based shift in chlorophyll (-4.3% to +16.4% respectively)}, PhyTrend successfully reveals how uniform global stressors can dictate divergent localized biological responses across the Earth system.

## Project Details
PhyTrend operates as a client-operated analytical engine designed to translate Giovanni data into actionable ecological intelligence. To evaluate the mathematics behind our model, we have provided four examples and outlined the equations as a demonstration of the site, as well as providing step-by-step directives for the user to upload their own files. Upon upload, the platform dynamically filters the harmonic seasonal variance to expose the climatological anomaly, plotting these refined data points on an interactive axis and calculating Sen's slope in order to attain a decadal magnitude of change, overlaying the historical sulfur dioxide emissions and volcanic eruption data to visualize the causal forcing.

One of the largest barriers to entry when it comes to Earth science in general is the computational learning curve required for statistical analysis and evaluating whether external factors cause this or whether it is an inherent trend. PhyTrend not only functions to make it more accessible to the general audience, but to streamline and speed-up data analysis and verifications with further integrated demonstrated modules in order to minimize any existent friction attributable to not being able to use the website. Furthermore, upon input the global map tracks the location which you are assessing, so you can verify whether your inputted .csv file matches your location. This project essentially democratizes climatological research and ensures that trends particularly apropos of chlorophyll variations, are correctly quantified, accurately attributed and are comprehensible to a larger audience.

The application uses a HTML foundation, with some CSS and JavaScript (using Gemini to assist with code, debugging and the generation of myriad fitted formulas), employing GitHub for deployment and version control (should it have to be iterated). To ensure broad accessibility we secured the domain phytrend.earth (through the GoDaddy Registry Offer) and enforced HTTPS to avoid any connection security concerns. The data is rooted in authoritative sources, integrating NASA Giovanni, NASA Earthdata Search, and NSIDC datasets (linked below).

PhyTrend's philosophy at its core is centered around spatial heterogeneity - how uniform global warming inevitably provokes contradictory regional responses, attempting to amalgamate three spheres (marine biogeochemistry, cryospheric retreat and volcanology) into a single lens. These ecological contradictions were prioritized via our interface, visually juxtaposing phenomena such as thermal stratification in the North Pacific Gyre (limited nutrient upwelling and starving phytoplankton) against the ice-melt in Chukchi Sea (increases light availability and catalyses blooms), thereby demonstrating that effective climatological analysis requires localized approaches to map the prevalent consequences of planetary forcing.

## NASA Data
* **NASA Giovanni:** data access and area-averaged time series
* **MODIS-Aqua chlorophyll a:** MODISA_L3m_CHL, R2022.0 (monthly and 8-day, 4 km)
* **MODIS-Aqua sea surface temperature:** MODISA_L3m_SST (11 µm daytime, monthly, 4 km)
* **NSIDC Sea Ice Index:** G02135, version 4 (regional monthly extent)
* **GES DISC Multi-Satellite Volcanic SO₂:** MSVOLSO2L4, version 4
* **NASA Earthdata Search:** dataset discovery<img width="1444" height="661" alt="Screenshot 2026-11-16 at 1 33 17 AM" src="https://github.com/user-attachments/assets/9076ed73-aa2a-4a1d-879b-3f14c8722876" />

