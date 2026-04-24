// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "eventkit-helper",
  platforms: [
    .macOS(.v13),
  ],
  targets: [
    .executableTarget(
      name: "eventkit-helper",
      path: "Sources"
    ),
  ]
)
