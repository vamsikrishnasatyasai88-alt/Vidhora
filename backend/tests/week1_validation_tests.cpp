
#include <iostream>
#include <cmath>
#include <string>

using namespace std;

// Validate an electricity usage reading.
bool isValidReading(float usage) {
    return isfinite(usage) && usage >= 0.0f;
}

// Detect unusually high electricity consumption.
bool isAnomaly(float current, float baseline) {
    if (!isValidReading(current) ||
        !isValidReading(baseline) ||
        baseline <= 0.0f) {
        return false;
    }

    return current > baseline * 1.2f;
}

int passed = 0;
int failed = 0;

// Run a test and report its result.
void check(const string& name, bool actual, bool expected) {
    if (actual == expected) {
        cout << "[PASS] " << name << '\n';
        passed++;
    } else {
        cout << "[FAIL] " << name << '\n';
        failed++;
    }
}

int main() {
    cout << "====================================\n";
    cout << " Vidhora - Week 1 Validation Tests\n";
    cout << "====================================\n\n";

    // Reading validation tests
    check("Positive reading is valid",
          isValidReading(100.0f), true);

    check("Zero reading is valid",
          isValidReading(0.0f), true);

    check("Negative reading is invalid",
          isValidReading(-5.0f), false);

    check("Infinite reading is invalid",
          isValidReading(INFINITY), false);

    check("NaN reading is invalid",
          isValidReading(NAN), false);

    // Anomaly detection tests
    check("Usage below threshold is normal",
          isAnomaly(110.0f, 100.0f), false);

    check("Usage exactly at 20 percent threshold is normal",
          isAnomaly(120.0f, 100.0f), false);

    check("Usage above threshold is anomalous",
          isAnomaly(125.0f, 100.0f), true);

    check("Zero baseline is handled safely",
          isAnomaly(50.0f, 0.0f), false);

    check("Negative current usage is not anomalous",
          isAnomaly(-10.0f, 100.0f), false);

    cout << "\n====================================\n";
    cout << "Tests passed: " << passed << '\n';
    cout << "Tests failed: " << failed << '\n';
    cout << "====================================\n";

    return failed == 0 ? 0 : 1;
}
