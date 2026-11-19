// Cuts the person out of a photo (transparent PNG) with Apple's on-device subject lifting
// (Vision, macOS 14+). Nothing leaves the Mac.
// Usage: swift scripts/cutout.swift <photo> <out.png> [maxHeightPx]
// Then point CUTOUT.src in src/lib/me.ts at the PNG (inside public/).
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else {
  print("usage: swift scripts/cutout.swift <photo> <out.png> [maxHeightPx]")
  exit(1)
}
let maxH = args.count > 3 ? Double(args[3]) ?? 1400 : 1400

guard let input = CIImage(contentsOf: URL(fileURLWithPath: args[1]), options: [.applyOrientationProperty: true]) else {
  print("can't read \(args[1])")
  exit(1)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: input)
do {
  try handler.perform([request])
} catch {
  print("vision failed: \(error)")
  exit(1)
}
guard let result = request.results?.first, !result.allInstances.isEmpty else {
  print("no person found in the photo")
  exit(1)
}

// Mask every subject found, keep the photo at full size, then crop to the subject.
let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
var out = CIImage(cvPixelBuffer: buffer)
if out.extent.height > maxH {
  let s = maxH / out.extent.height
  out = out.transformed(by: CGAffineTransform(scaleX: s, y: s))
}

let ctx = CIContext()
guard let cg = ctx.createCGImage(out, from: out.extent) else {
  print("couldn't render")
  exit(1)
}
let rep = NSBitmapImageRep(cgImage: cg)
guard let png = rep.representation(using: .png, properties: [:]) else {
  print("couldn't encode PNG")
  exit(1)
}
try png.write(to: URL(fileURLWithPath: args[2]))
print("wrote \(args[2]) (\(cg.width)x\(cg.height))")
