---
# Sources: old site page, resume, LinkedIn.
title: "AI pose tracking at Mount Sinai"
folder: ai-ml
alsoIn: [research]
start: '2024-07'
end: '2024-08'
role: Research Intern, AI & Computational Biology
seoTitle: "AI pose tracking at Mount Sinai"
summary: "I built a deep-learning tool that tracks mice through experiment videos, for memory research in Dr. Okamoto's lab."
result: "It analyzed 75+ experiment videos, and a PhD researcher took it over for the lab."
tags: [Python, SLEAP, Deep learning, OpenCV, pandas, NumPy, Docker]
featured: 2
cover: ../../assets/photos/Okamoto.jpg
coverAlt: Aryan at a lab bench in a white coat and gloves
photos:
  - src: ../../assets/photos/okamoto-lab/IMG_9485.jpg
    alt: Aryan at the bench, preparing CaMP protein samples
    caption: CaMP protein spectrometry
  - src: ../../assets/photos/okamoto-lab/IMG_9470.jpg
    alt: Aryan running an experiment next to a lab computer
    caption: Running experiments
  - src: ../../assets/photos/okamoto-lab/IMG_9418.jpg
    alt: Green fluorescent signal on a dark microscope image
    caption: "GCaMP: calcium activated"
  - src: ../../assets/photos/okamoto-lab/IMG_9455.jpg
    alt: A robotic arm inside a lab
    caption: Cool robot
  - src: ../../assets/photos/okamoto-lab/biocomputing.png
    alt: Code editor with the mouse-tracking scripts and a tracked video frame
    caption: The mouse-tracking code
  - src: "../../assets/photos/okamoto-lab/Quinn Family Internship Presentation_page-0001.jpg"
    alt: "Title slide: My Internship Experience, by Aryan Khimani"
    caption: My internship presentation
links:
  - label: Mouse pose estimation code
    href: https://github.com/aryankhimani/Mouse-Pose-Estimation
  - label: Internship presentation (slides)
    href: https://docs.google.com/presentation/d/1f2h4ncusnhS8-F1CkWxjhQebHNUkpbZvmpU9naKJyjg/edit?usp=sharing
  - label: Dr. Okamoto's lab
    href: https://www.lunenfeld.ca/?page=okamoto-kenichi
---

## What I built

- A deep-learning pose-tracking pipeline (SLEAP, OpenCV, pandas, NumPy). I designed and built it on my own, end to end.
- 10 Python scripts and a GUI that run the model, chart the results and export annotated videos.
- A Docker setup that ships with the trained model, so anyone in the lab can run it. The code is open source.

## What came of it

- The tool analyzed 75+ experiment videos for research on how the protein CaMKIIβ affects memory.
- I handed it off to a PhD researcher for ongoing use in the lab.

## The rest of the summer

I wasn't only at a keyboard. I also ran 210+ CaMP protein assays at the bench. Dr. Kenichi Okamoto's lab is part of Mount Sinai's Lunenfeld-Tanenbaum Research Institute.
