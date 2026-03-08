# ShinobiDroid — Chart Color Test

> Testing Mermaid pie chart colors with the new vivid theme.

---

## Findings by Engine

```mermaid
pie title Findings by Engine
    "MobSF" : 96
    "Androwarn" : 1
    "Firebase" : 1
    "Frida" : 1
    "Logcat" : 1
```

## Category Breakdown

```mermaid
pie title Category Breakdown
    "Code Security" : 48
    "Permissions" : 22
    "Network" : 14
    "Cryptography" : 8
    "Manifest" : 5
    "Data Storage" : 3
```

## Severity Distribution

```mermaid
pie title Severity Distribution
    "Critical" : 3
    "High" : 12
    "Medium" : 31
    "Low" : 18
    "Info" : 36
```

## Attack Surface Flow

```mermaid
flowchart LR
    A[📱 APK Upload] --> B[MobSF Static]
    A --> C[Androwarn]
    A --> D[Firebase Scanner]
    B --> E[AI Engine]
    C --> E
    D --> E
    E --> F[📄 PDF Report]
```
