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