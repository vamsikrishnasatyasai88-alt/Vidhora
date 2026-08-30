#include <iostream>
using namespace std;

int main() {
    float normal, current;

    cout << "Enter normal average usage: ";
    cin >> normal;

    cout << "Enter current usage: ";
    cin >> current;

    if (current > normal * 1.2)
        cout << "Anomaly detected: Unusually high consumption!\n";
    else
        cout << "Usage is normal.\n";

    return 0;
}

//2
#include <iostream>
using namespace std;

void anomalyDetector() {
    float usage[5], total = 0;

    cout << "Enter electricity usage for 5 days:\n";

    for (int i = 0; i < 5; i++) {
        cout << "Day " << i + 1 << ": ";
        cin >> usage[i];
        total += usage[i];
    }

    float average = total / 5;

    cout << "\nAverage Usage: " << average << " kWh\n";

    for (int i = 0; i < 5; i++) {
        if (usage[i] > average * 1.2)
            cout << "Anomaly detected on Day "
                 << i + 1 << "!\n";
    }
}




