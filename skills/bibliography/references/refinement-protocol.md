# Refinement Protocol: Raw Description -> Structured Search Goal

## Purpose

Transform a messy, informal research description into a precise, domain-aware
structured search goal that maximizes recall across scientific databases.

## Step 1: Concept Extraction

Read the raw description and extract:

- **Core problem**: What is the user trying to solve?
- **Domain**: What scientific field(s) does this belong to?
- **Methods mentioned**: Algorithms, techniques, tools, libraries
- **Data characteristics**: What kind of data? Resolution, size, format?
- **Constraints**: Real-time? Embedded? Label-free? Low-cost?
- **End goal**: Classification? Detection? Prediction? Monitoring?

## Step 2: Terminology Expansion

For each extracted concept, identify:

- **Formal synonyms**: e.g., "bacteria detection" = "microbial detection" =
  "pathogen screening"
- **Related methods**: e.g., user mentions YOLO -> also search for "object
  detection", "SSD", "Faster R-CNN", "real-time detection"
- **Domain-specific jargon**: e.g., "MSD" = "mean squared displacement",
  "run-and-tumble" for bacterial motility
- **Broader categories**: e.g., user's specific problem maps to "label-free
  biosensing", "digital microscopy", "point-of-care diagnostics"

## Step 3: Inclusion/Exclusion Criteria

Based on the description, define what IS and IS NOT relevant:

**Include examples:**
- Label-free optical methods
- Machine learning for microscopy
- Trajectory-based classification
- Low-cost or portable devices

**Exclude examples:**
- Fluorescence-based methods (if user is label-free)
- PCR/genomic methods (if user is image-based)
- Electrochemical sensors (if user is optical)

## Step 4: Sub-topic Decomposition

Break the search into 6-12 specific sub-topics. Each should be:
- Searchable independently
- Narrow enough to yield focused results
- Broad enough to find 5-15 papers

**Pattern for sub-topics:**
> [Specific method/approach] for [specific aspect of the problem] in [domain context]

Example decomposition for a bacteria microscopy project:
1. Trajectory-based bacteria vs inert particle discrimination
2. Deep learning object detection in low-resolution label-free microscopy
3. Sample-level classification from trajectory sets (MIL, set encoders)
4. Lightweight real-time detection and tracking on edge devices
5. Time-series classification of particle trajectories
6. MSD-based diffusion analysis for active vs passive discrimination
7. Digital holographic microscopy for bacteria detection
8. Portable/miniaturized microscopes with deep learning
9. Run-and-tumble motility feature engineering
10. Anomaly detection on microscopy videos

## Step 5: Draft the Structured Search Goal

Write a single coherent paragraph that:
1. Opens with the high-level system being researched
2. Describes the sensing/measurement approach
3. Lists the current pipeline components
4. States the end goal clearly
5. Enumerates specific sub-topics to search with "Please find papers on: ..."
6. States what to include and exclude

**Tone**: Precise, technical, written for a domain expert. No typos. Use
standard terminology. This paragraph will guide all subsequent search queries.

## Step 6: User Review

Present the structured search goal to the user. Ask:
- Does this capture your research accurately?
- Any sub-topics to add or remove?
- Any exclusion criteria to adjust?

Iterate until the user approves. Then save to artifacts.
