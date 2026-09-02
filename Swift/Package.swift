// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "AIODMA",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "AIODMA",
            targets: ["AIODMA"]
        ),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "AIODMA",
            dependencies: [],
            path: "AIODMA"
        ),
    ]
)
