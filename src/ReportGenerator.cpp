#include <iostream>
using namespace std;

int main() {
    float total, average;

    cout << "Enter total electricity usage: ";
    cin >> total;

    cout << "Enter average usage: ";
    cin >> average;

    cout << "\n--- VIDHORA REPORT ---\n";
    cout << "Total Consumption: " << total << " kWh\n";
    cout << "Average Consumption: " << average << " kWh\n";

    if (total > average * 30)
        cout << "Insight: Consumption is higher than expected.\n";
    else
        cout << "Insight: Consumption is within the normal range.\n";

    return 0;
}


#include <iostream>
#include <fstream>
using namespace std;

void saveReading() {
    float usage;

    cout << "Enter electricity usage: ";
    cin >> usage;

    ofstream file("data/readings.txt", ios::app);

    if (file.is_open()) {
        file << usage << endl;
        file.close();
        cout << "Reading saved successfully.\n";
    }
    else {
        cout << "Unable to open file.\n";
    }
}  