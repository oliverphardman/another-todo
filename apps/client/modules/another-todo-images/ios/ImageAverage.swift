import CoreGraphics
import Foundation
import ImageIO

enum ImageAverage {
  private static let size = 32

  static func color(of data: Data, from: Double, to: Double) -> String? {
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: 256,
    ]
    guard
      let source = CGImageSourceCreateWithData(data as CFData, nil),
      let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary),
      let space = CGColorSpace(name: CGColorSpace.sRGB)
    else {
      return nil
    }
    var pixels = [UInt8](repeating: 0, count: size * size * 4)
    let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard
        let context = CGContext(
          data: buffer.baseAddress, width: size, height: size, bitsPerComponent: 8,
          bytesPerRow: size * 4, space: space,
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else {
        return false
      }
      context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
      return true
    }
    guard drawn else {
      return nil
    }
    let first = Int((from * Double(size)).rounded(.down))
    let last = Int((to * Double(size)).rounded(.up))
    var totals = [0, 0, 0]
    for offset in stride(from: first * size * 4, to: last * size * 4, by: 4) {
      for channel in 0..<3 {
        totals[channel] += Int(pixels[offset + channel])
      }
    }
    let count = Double((last - first) * size)
    let channels = totals.map { String(format: "%02x", Int((Double($0) / count).rounded())) }
    return "#" + channels.joined()
  }
}
