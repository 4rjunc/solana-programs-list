## ESCROW

    A["Alice with Asset A"] -->|"1. Sends Asset A"| C["Escrow C"]
    B["Bob with Asset B"] -->|"2. Sends Asset B"| C
    C -->|"3. Verifies both assets received"| C
    C -->|"4. Sends Asset B"| A
    C -->|"5. Sends Asset A"| B
    A -->|"Now has Asset B"| A2["Alice with Asset B"]
    B -->|"Now has Asset A"| B2["Bob with Asset A"]
