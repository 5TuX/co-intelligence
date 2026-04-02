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

### Step 2b: Alternative Approaches (CRITICAL)

For each method the user mentions, identify COMPETING or ALTERNATIVE methods
they may not know about. This prevents missing entire sub-fields.

Examples:
- User tracks individual bacteria -> also search for "differential dynamic
  microscopy" (DDM), which extracts motility statistics WITHOUT tracking
- User uses bright-field microscopy -> also search for "digital holographic
  microscopy" (DHM), "quantitative phase imaging" (QPI), "lensless microscopy"
- User uses YOLO for detection -> also search for other single-shot detectors,
  but also tracking-free approaches like DDM or speckle imaging
- User classifies from scalar features -> also search for "set classification",
  "permutation-invariant networks", "multiple instance learning"

Ask: "What other methods solve the SAME problem differently?"

### Step 2c: Foundational Methods

For each technique in the user's pipeline, identify the seminal paper(s)
that introduced it, even if they're from a different domain:

- User uses Kalman filter tracking -> Berg & Brown 1972 (bacterial tracking),
  SORT/DeepSORT/ByteTrack (MOT community)
- User uses MIL for sample-level classification -> Deep Sets (Zaheer 2017),
  Attention MIL (Ilse 2018), Set Transformer (Lee 2018)
- User uses trajectory features -> AnDi Challenge papers, anomalous diffusion

These foundational papers ground the bibliography and help domain experts
navigate it. Include them even if they don't mention the user's specific
application domain.

### Step 2d: Research Family Tracing

If the user mentions specific labs, institutions, or researcher names
(e.g., "my advisor is Prof. X at Y University", "I follow work from the
Z lab at W institute"), plan to systematically fetch all their recent
publications during Wave 1.5 (Author Hub Mining).

Also: if the user's raw description references specific papers or
project names, search for those exact titles to seed the anchor search
and identify the research community around them.

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
> [Specific method/approach] for [specific aspect of the problem] in [domain]

Include at least one sub-topic for:
- The user's EXACT problem (most specific query possible)
- Each alternative method discovered in Step 2b
- Foundational methods from Step 2c
- Edge/deployment constraints if applicable
- The broader application domain (clinical, industrial, etc.)

## Step 5: Draft the Structured Search Goal

Write a single coherent paragraph that:
1. Opens with the high-level system being researched
2. Describes the sensing/measurement approach
3. Lists the current pipeline components
4. States the end goal clearly
5. Enumerates specific sub-topics with "Please find papers on: ..."
6. States what to include and exclude

**Tone**: Precise, technical, domain-expert level.

## Step 6: User Review

Present the structured search goal to the user. Ask:
- Does this capture your research accurately?
- Any sub-topics to add or remove?
- Any exclusion criteria to adjust?
- Are there specific authors or labs whose work you follow?

Iterate until approved. Save to session directory.
