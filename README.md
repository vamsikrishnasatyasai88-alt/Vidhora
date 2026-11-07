# ⚡ Vidhora – Smart Electricity Usage Analyzer

<p align="center">
  <strong>An Intelligent Electricity Consumption Monitoring and Anomaly Detection System</strong>
</p>

<p align="center">
  <a href="https://vidhora.vercel.app/">🌐 Live Demo</a> •
  <a href="https://github.com/vamsikrishnasatyasai88-alt/Vidhora">💻 GitHub Repository</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Language-C%2B%2B-blue?style=for-the-badge&logo=c%2B%2B" alt="C++"/>
  <img src="https://img.shields.io/badge/Project-Electricity_Analytics-orange?style=for-the-badge" alt="Electricity Analytics"/>
  <img src="https://img.shields.io/badge/Domain-Data_Analysis-green?style=for-the-badge" alt="Data Analysis"/>
</p>

---

## 📌 About The Project

**Vidhora** is a Smart Electricity Usage Analyzer developed to monitor, manage, and analyze electricity consumption data.

The project focuses on identifying unusual electricity consumption patterns, detecting sudden spikes, analyzing historical usage, and generating meaningful insights from electricity readings.

Vidhora uses C++ for its core processing and analytical operations. It applies programming concepts, object-oriented design, data structures, and statistical algorithms to transform raw electricity consumption data into useful information.

The main objective is to demonstrate how C++ programming can be applied to solve a real-world problem through data processing, statistical calculations, and intelligent analysis.

## 🎯 Project Objectives

- Analyze electricity consumption records.
- Calculate average, minimum, and maximum electricity usage.
- Detect abnormal electricity consumption.
- Identify sudden increases in electricity usage.
- Analyze weekly and monthly consumption patterns.
- Calculate statistical measurements.
- Generate meaningful electricity usage insights.
- Apply C++ programming and object-oriented concepts to a practical application.

## ✨ Key Features

### 1. Electricity Consumption Analysis
- Calculate total electricity consumption.
- Determine average electricity usage.
- Identify minimum and maximum consumption.
- Analyze historical electricity readings.

### 2. Anomaly Detection
- Identify unusual electricity consumption.
- Compare readings against historical baselines.
- Classify abnormal consumption based on severity.
- Highlight unexpected usage patterns.

### 3. Statistical Analysis
- Mean calculation.
- Variance calculation.
- Standard deviation.
- Minimum and maximum values.
- Statistical baseline calculation.

### 4. Trend Analysis
- Analyze increasing and decreasing consumption trends.
- Apply linear regression.
- Compare historical consumption.
- Identify changes in electricity usage.

### 5. Spike Detection
- Identify sudden increases in electricity consumption.
- Detect unusual consumption changes.
- Highlight abnormal usage periods.

### 6. Dataset Management
- Import electricity readings through CSV files.
- View and manage historical records.
- Search and sort electricity readings.
- Update and delete records.
- Export electricity readings.
- Maintain persistent application data.

### 7. Appliance-Level Analysis
When appliance-level information is available, Vidhora supports analysis of categories such as:

- Air Conditioning
- Refrigerators
- Fans
- Lighting
- Washing Machines
- Other Appliances

---

# 💻 C++ Concepts Used in Vidhora

Vidhora demonstrates important concepts from Object-Oriented Programming using C++.

The following concepts are particularly relevant to the implementation and explanation of the project.

## 1. Classes and Objects

**Concept:**

A class is a blueprint that defines data members and member functions. An object is an instance of a class.

**Application in Vidhora:**

Classes provide a structured way to organize electricity readings and analytical operations.

For example, electricity reading management and statistical analysis can be represented through separate classes.

This improves code organization, modularity, and reusability.

## 2. Encapsulation

**Concept:**

Encapsulation combines data and the functions that operate on that data into a single unit.

C++ provides access specifiers such as:

- `private`
- `public`
- `protected`

**Application in Vidhora:**

Encapsulation helps organize electricity reading information and its associated operations.

For example, reading-related data can be kept private while public member functions provide controlled access to that information.

This helps protect data from unintended modifications.

## 3. Abstraction

**Concept:**

Abstraction hides internal implementation details and exposes only the necessary functionality.

**Application in Vidhora:**

Vidhora separates analytical processing from the way users interact with the application.

The internal statistical calculations, anomaly detection, and trend analysis are handled by the C++ processing layer.

Users receive meaningful analytical results without needing to understand the internal calculation process.

This demonstrates abstraction through separation of implementation and functionality.

## 4. Functions and Modular Programming

**Concept:**

Functions divide a large program into smaller reusable blocks of code.

**Application in Vidhora:**

Different analytical operations are organized into separate processing functions.

Examples include:

- Calculating average consumption.
- Finding minimum and maximum readings.
- Calculating standard deviation.
- Detecting anomalies.
- Identifying consumption spikes.
- Calculating consumption trends.

This makes the application easier to maintain and extend.

## 5. Inheritance

**Concept:**

Inheritance allows one class to acquire the properties and member functions of another class.

**Application in Vidhora:**

Inheritance can be used to organize common functionality between different types of electricity analysis modules.

For example, a common analysis base class could provide shared functionality, while specialized analysis classes could implement individual operations such as anomaly detection and trend analysis.

This is an applicable OOP design pattern for Vidhora. Include it as an implemented concept only if the actual C++ source contains the corresponding base and derived classes.

## 6. Polymorphism

**Concept:**

Polymorphism allows the same interface or function name to represent different behaviors.

The important types include:

- Compile-time polymorphism.
- Runtime polymorphism.

**Application in Vidhora:**

Polymorphism can support different analytical operations through a common interface.

For example, different analysis modules could implement their own analysis methods while being accessed through a common base-class interface.

Function overloading can also be used to support different forms of analytical operations.

Document runtime polymorphism as implemented only when the source code actually uses virtual functions and overriding.

---

# 📊 Algorithms Used

| Algorithm / Technique | Application |
|---|---|
| Mean Calculation | Calculates average electricity consumption |
| Minimum and Maximum | Identifies consumption boundaries |
| Variance | Measures variation in readings |
| Standard Deviation | Measures the spread of electricity consumption |
| Linear Regression | Identifies consumption trends |
| Baseline Calculation | Establishes expected consumption |
| Anomaly Detection | Identifies unusual electricity readings |
| Spike Detection | Identifies sudden increases in consumption |

### Statistical Analysis

Vidhora uses statistical calculations to understand electricity consumption patterns.

**Average:**

```text
Average = Sum of all readings / Total number of readings
```

**Standard Deviation:**

Standard deviation measures how far electricity readings are spread around the average.

**Linear Regression:**

```text
y = mx + c
```

Where:

- `y` = Predicted consumption.
- `x` = Time or observation index.
- `m` = Slope.
- `c` = Intercept.

A positive slope indicates increasing consumption, while a negative slope indicates decreasing consumption.

---

## 🏗️ System Architecture

Vidhora organizes its functionality into logical processing layers.

```text
             USER
               |
               v
      +-------------------+
      |  User Interface   |
      +-------------------+
               |
               v
      +-------------------+
      |  Data Management  |
      +-------------------+
               |
               v
      +-------------------+
      |   C++ Processing  |
      +-------------------+
               |
               v
      +-------------------+
      | Analysis Engine   |
      |                   |
      | - Statistics      |
      | - Anomaly         |
      |   Detection       |
      | - Trend Analysis  |
      | - Spike Detection |
      +-------------------+
               |
               v
      +-------------------+
      | Data Persistence  |
      +-------------------+
               |
               v
        Analysis Results
```

## 📂 Dataset Information

Vidhora includes a preloaded electricity consumption dataset based on the PJM Open Energy Dataset.

| Property | Description |
|---|---|
| Dataset | PJM Open Energy Dataset |
| Records | 365 daily readings |
| Format | CSV / JSON |
| Analysis | Consumption and anomaly analysis |
| Categories | Appliance-level data when available |

Vidhora also supports importing compatible CSV datasets.

For datasets without appliance-level information, overall consumption analysis and anomaly detection remain available.

---

## ⚙️ Installation and Setup

### Prerequisites

- C++ compiler.
- Visual Studio 2019/2022.
- CMake 3.20 or newer.
- Git.

### Step 1: Clone Repository

```bash
git clone https://github.com/vamsikrishnasatyasai88-alt/Vidhora.git
```

```bash
cd Vidhora
```

### Step 2: Configure C++ Backend

```powershell
cmake -S backend -B backend/build -G "Visual Studio 17 2022" -A x64
```

### Step 3: Build Project

```powershell
cmake --build backend/build --config Release
```

### Step 4: Run Backend

```powershell
backend/build/bin/Release/vidhora_backend.exe
```

Expected output:

```text
Vidhora C++ Backend listening on port 8080
```

### Step 5: Run Tests

```powershell
backend/build/bin/Release/vidhora_tests.exe
```

Previously documented test result:

```text
96 passed, 0 failed
```

---


## 🎓 Project Significance

Vidhora demonstrates how C++ programming and object-oriented concepts can be applied to a practical real-world problem.

The project combines data processing, statistical algorithms, object-oriented programming, and analytical techniques to develop an electricity consumption analysis system.

It provides practical exposure to:

- Classes and Objects.
- Encapsulation.
- Abstraction.
- Inheritance and Polymorphism where implemented.
- Functions and Modular Programming.
- Data Processing.
- Statistical Algorithms.
- File Handling.

---

## 🛠️ Tech Stack Used

| Technology | Purpose |
|---|---|
| C++ | Core programming and analytical processing |
| STL | Data management and processing |
| CMake | C++ project build configuration |
| cpp-httplib | HTTP server communication |
| nlohmann/json | JSON processing |
| CSV | Electricity dataset import and export |
| JSON | Structured data storage |

---

<p align="center">
  <strong>Vidhora – Making Electricity Consumption Smarter ⚡</strong>
</p>

<p align="center">
  <a href="https://vidhora.vercel.app/">Live Demo</a> •
  <a href="https://github.com/vamsikrishnasatyasai88-alt/Vidhora">GitHub Repository</a>
</p>
