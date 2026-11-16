---
# Sources: old site page, resume, LinkedIn.
title: Dr. Okamoto's Lab, Mount Sinai
folder: research
alsoIn: [code]
start: '2024-07'
end: '2024-08'
role: Research Intern, AI & Computational Biology
summary: An AI pose-tracking tool for memory research, built at the Lunenfeld-Tanenbaum Research Institute.
result: My tool analyzed 75+ experiment videos and stayed in use in the lab.
tags: [Python, SLEAP, OpenCV, pandas, Neuroscience]
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

## What it is

Dr. Kenichi Okamoto's lab at Mount Sinai's Lunenfeld-Tanenbaum Research Institute studies memory and protein expression. My project supported research on how the protein CaMKIIβ affects memory.

## What I did

- Scoped, designed and built a deep-learning pose-tracking pipeline on my own (SLEAP, OpenCV, pandas, NumPy) that follows mice through behavioural experiment videos.
- Wrote 10 Python scripts and a GUI that run the model, chart the results and export annotated videos. The trained model ships with a Docker setup so anyone in the lab can run it.
- Ran 210+ experiments on CaMP proteins at the bench.

## What came of it

- The tool analyzed 75+ experiment videos.
- I handed it off to a PhD researcher, and the lab kept using it.
