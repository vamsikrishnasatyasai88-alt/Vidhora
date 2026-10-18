#include <iostream>
using namespace std;

int main() {
    float usage;

    cout << "Enter electricity consumption (kWh): ";
    cin >> usage;

    cout << "Electricity Consumption: " << usage << " kWh\n";

    return 0;
}


#include <iostream>
using namespace std;

void energyReading() {
    float ac, fan, lights, fridge;

    cout << "Enter AC usage: ";
    cin >> ac;

    cout << "Enter Fan usage: ";
    cin >> fan;

    cout << "Enter Lights usage: ";
    cin >> lights;

    cout << "Enter Fridge usage: ";
    cin >> fridge;

    float total = ac + fan + lights + fridge;

    cout << "\nTotal Electricity Usage: "
         << total << " kWh\n";