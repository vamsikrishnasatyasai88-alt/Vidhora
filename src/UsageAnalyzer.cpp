#include <iostream>
using namespace std;

int main() {
    float usage[5], total = 0;

    cout << "Enter electricity usage for 5 days:\n";

    for (int i = 0; i < 5; i++) {
        cin >> usage[i];
        total += usage[i];
    }

    cout << "Total Usage: " << total << " kWh\n";
    cout << "Average Usage: " << total / 5 << " kWh\n";

    return 0;
}