# ⚡ Vidhora – Electricity Consumption Analysis & Anomaly Detection

Vidhora is a **C++-based electricity consumption monitoring and analysis system** developed as a group project. The system allows users to record electricity consumption readings, analyze usage patterns, calculate total and average consumption, detect unusually high energy usage, and generate consumption reports.

The project follows a **modular Object-Oriented Programming (OOP)** approach, separating different responsibilities such as energy reading, usage analysis, anomaly detection, file management, and report generation.

---

## 📌 Project Description

Electricity consumption varies depending on the usage of appliances and daily activities. Monitoring consumption manually can make it difficult to identify unusual or excessive energy usage.

**Vidhora** provides a simple software-based solution to analyze electricity consumption data. Users can enter energy readings and appliance-level consumption values. The system processes the collected data, calculates consumption statistics, identifies abnormal usage, and generates a basic report.

The project demonstrates how **C++, OOP, file handling, data analysis, and anomaly detection** can be combined to create a practical electricity consumption analysis application.

---

## 🎯 Objectives

The main objectives of Vidhora are:

- To record electricity consumption readings.
- To calculate total electricity consumption.
- To calculate average electricity consumption.
- To analyze electricity usage over multiple readings.
- To identify unusually high energy consumption.
- To support appliance-wise consumption analysis.
- To store consumption readings using file handling.
- To generate electricity consumption reports.
- To demonstrate modular and object-oriented C++ programming.

---

## ✨ Key Features

### ⚡ Electricity Consumption Recording

Users can enter electricity consumption readings in **kilowatt-hours (kWh)** for analysis.

### 🏠 Appliance-wise Consumption

The system can work with consumption information for common appliances such as:

- Air Conditioner
- Fan
- Lights
- Refrigerator

### 📊 Usage Analysis

The system analyzes recorded readings and calculates:

- Total consumption
- Average consumption
- Consumption patterns

### 🚨 Anomaly Detection

Vidhora includes an anomaly detection component that helps identify unusually high electricity consumption based on the expected usage level.

### 💾 File Handling

Electricity consumption readings can be stored in a text file so that the data can be retained and used for further analysis.

### 📄 Report Generation

The system generates a basic report containing electricity consumption statistics and usage insights.

### 🧩 Modular Design

The project is divided into multiple modules, making the code easier to understand, maintain, test, and extend.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **C++** | Core programming language |
| **Object-Oriented Programming** | Program structure and modular design |
| **File Handling** | Reading and storing consumption data |
| **Data Analysis** | Calculation of total and average usage |
| **Anomaly Detection** | Identification of unusually high consumption |
| **Git & GitHub** | Version control and team collaboration |

---

## 🏗️ Project Architecture

The project is organized into separate components based on their responsibilities.

```text
                     ┌──────────────────────┐
                     │      User Input      │
                     │ Electricity Readings │
                     └───────────┬──────────┘
                                 │
                                 ▼
                     ┌──────────────────────┐
                     │   Energy Reading     │
                     │       Module         │
                     └───────────┬──────────┘
                                 │
                                 ▼
                     ┌──────────────────────┐
                     │    Usage Analyzer    │
                     │ Total & Average Usage│
                     └───────────┬──────────┘
                                 │
                                 ▼
                     ┌──────────────────────┐
                     │   Anomaly Detector   │
                     │  Detect High Usage   │
                     └───────────┬──────────┘
                                 │
                                 ▼
                     ┌──────────────────────┐
                     │   Report Generator   │
                     │    Usage Summary     │
                     └───────────┬──────────┘
                                 │
                                 ▼
                     ┌──────────────────────┐
                     │     File Manager     │
                     │    Data Storage      │
                     └──────────────────────┘
