# RealRobo - Premium Automation Provider API Documentation

## Overview

Integrate recharges into your application using RealRobo's API services.

**Base URL:** `https://realrobo.in/api/`

**Important:** All requests require `api_token` parameter.

**XMPP IDs:**

- multirobo@xmpp.jp
- multirobo@jabb.im

## Available Endpoints

1. [Recharge](#recharge-api)
2. [Balance](#balance-api)
3. [Operator Balance](#operator-balance-api)
4. [Operator Lapu Balance](#operator-lapu-balance-api)
5. [Lapu Balance](#lapu-balance-api)
6. [Party Balance](#party-balance-api)
7. [Party Lapu Balance](#party-lapu-balance-api)
8. [Status Check](#status-check-api)
9. [Operator Codes](#operator-codes)
10. [State Codes](#state-codes)

---

## Recharge API

**Endpoint:** `GET / POST https://realrobo.in/api/recharge`

### Required Parameters

| Parameter     | Type   | Description                   |
| ------------- | ------ | ----------------------------- |
| `api_token`   | string | Your API authentication token |
| `number`      | string | Mobile number to recharge     |
| `amount`      | number | Recharge amount               |
| `operator_id` | number | Operator ID                   |
| `req_id`      | string | Unique request ID             |

### GET Example

```
https://realrobo.in/api/recharge?api_token=12345678-1234-1234-1234-123456789012&number=1234567890&amount=10&req_id=123456&operator_id=1
```

### XMPP Message

```
api_token=12345678-1234-1234-1234-123456789012&number=1234567890&amount=10&req_id=123456&operator_id=1
```

### Response Example

```json
{
  "status": "success",
  "txid": "1523148787",
  "message": "recharge successful",
  "remark": "",
  "req_id": "123456",
  "req_time": "2021-06-28T17:33:56.731Z",
  "number": "1234567890",
  "amount": 10,
  "offer": 0,
  "lapu": {
    "lapu_id": 1,
    "lapu_no": "1234567890",
    "balance": 18619
  },
  "recharge_id": 1350579228,
  "operator_id": 1,
  "operator_name": "Airtel",
  "state_id": 1
}
```

**Status Values:** `success` / `failure`

### Optional Parameters & Tips

| Parameter                | Description                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| `roffer_only=true`       | ROffer only recharge                                                      |
| `lapu_id=[lapu id]`      | Lapu wise recharge (Lapu ID shown in lapu list)                           |
| `party_id=[party id]`    | Party wise recharge (Party ID shown in party list)                        |
| `is_stv=true`            | DTH using customer number                                                 |
| `auto_cust=true`         | DTH auto switch subscriber/mobile                                         |
| `auto_cust=true`         | Airtel Prepaid/Postpaid auto switch                                       |
| `is_postpaid=true`       | Postpaid payment (Currently available for Airtel Postpaid)                |
| `no_roam=true`           | Restrict roam recharges                                                   |
| `state_id=[state code]`  | State code (optional - Auto-fetched if not provided)                      |
| `extra=[value]`          | Extra parameter                                                           |
| `extra2=[value]`         | Extra2 parameter                                                          |
| `extra3=[value]`         | Extra3 parameter                                                          |
| `queue=true`             | Queue processing                                                          |
| `times=10`               | Order checking time (default 10s, max 500s)                               |
| `sub_operator_id=[code]` | For Airtel Money / Airtel Thanks / Mobikwik / Paytm / Amazon / Freecharge |

**Important Notes:**

- DTH recharge using customer number: If the customer number has multiple accounts then the recharge will be failed
- Specially for J&K users: Use appropriate parameters

---

## Balance API

**Endpoint:** `GET / POST https://realrobo.in/api/balance`

### Required Parameters

| Parameter   | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `api_token` | string | Your API authentication token |

### Optional Parameters

| Parameter                                       | Description        |
| ----------------------------------------------- | ------------------ |
| `lapu_id=121313`                                | Filter by lapu     |
| `operator_id=1`                                 | Filter by operator |
| `party_id=12345678-1234-1234-1234-123456789012` | Filter by party    |

### Response Example

```json
{
  "status": true,
  "msg": "Success.",
  "data": {
    "balance": 764191
  }
}
```

**Note:** Returns cached data from the database, not live balance.

---

## Operator Balance API

**Endpoint:** `GET / POST https://realrobo.in/api/operator_balance`

### Required Parameters

| Parameter   | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `api_token` | string | Your API authentication token |

### Response Example

```json
{
  "status": true,
  "msg": "Success.",
  "data": {
    "airtel": 18619,
    "bsnl": 15476,
    "jio": 36743,
    "vodafoneidea": 32662,
    "airteldth": 57436,
    "dishtv": 23467,
    "sundirect": 6346,
    "tatasky": 75447,
    "videocond2h": 6236
  }
}
```

**Note:** Returns cached data from the database, not live balance.

---

## Operator Lapu Balance API

**Endpoint:** `GET / POST https://realrobo.in/api/operator_lapu_balance`

### Required Parameters

| Parameter     | Type   | Description                   |
| ------------- | ------ | ----------------------------- |
| `api_token`   | string | Your API authentication token |
| `operator_id` | number | Operator ID                   |

### Response Example

```json
{
  "status": true,
  "msg": "Success.",
  "data": {
    "1234567890": 18619
  }
}
```

**Note:** Returns cached data from the database, not live balance.

---

## Lapu Balance API

**Endpoint:** `GET / POST https://realrobo.in/api/lapu_balance`

### Required Parameters

| Parameter   | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `api_token` | string | Your API authentication token |
| `lapu_id`   | number | Lapu ID                       |

### Response Example

```json
{
  "status": true,
  "msg": "Success.",
  "data": {
    "lapu_no": "1234567890",
    "balance": 18619
  }
}
```

**Note:** Returns cached data from the database, not live balance.

---

## Party Balance API

**Endpoint:** `GET / POST https://realrobo.in/api/party_balance`

### Required Parameters

| Parameter   | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `api_token` | string | Your API authentication token |

### Response Example

```json
{
  "status": true,
  "msg": "Success.",
  "data": {
    "abc": 18619,
    "xyz": 15476
  }
}
```

**Note:** Returns cached data from the database, not live balance.

---

## Party Lapu Balance API

**Endpoint:** `GET / POST https://realrobo.in/api/party_lapu_balance`

### Required Parameters

| Parameter   | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `api_token` | string | Your API authentication token |
| `party_id`  | string | Party ID                      |

### Response Example

```json
{
  "status": true,
  "msg": "Success.",
  "data": {
    "1234567890": 18619
  }
}
```

**Note:** Returns cached data from the database, not live balance.

---

## Status Check API

**Endpoint:** `GET / POST https://realrobo.in/api/status_check`

### Required Parameters

| Parameter   | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `api_token` | string | Your API authentication token |
| `req_id`    | string | Request ID to check           |

### Response Example

```json
{
  "status": "success",
  "txid": "1523148787",
  "message": "recharge successful",
  "remark": "",
  "req_id": "123456",
  "req_time": "2021-06-28T17:33:56.731Z",
  "number": "1234567890",
  "amount": 10,
  "offer": 0,
  "lapu": {
    "lapu_id": 1,
    "lapu_no": "1234567890",
    "balance": 18619
  },
  "recharge_id": 1350579228,
  "operator_id": 1,
  "operator_name": "Airtel",
  "state_id": 1
}
```

**Note:** Returns cached data from the database, not live status from operator.

---

## Operator Codes

### Mobile Operators

| Operator      | ID  | Description          |
| ------------- | --- | -------------------- |
| Airtel        | 1   | Airtel Mobile        |
| BSNL          | 2   | BSNL Mobile          |
| Jio           | 3   | Reliance Jio         |
| Vodafone Idea | 4   | Vodafone Idea Mobile |
| AeroVoyce     | 10  | AeroVoyce Mobile     |

### DTH Operators

| Operator         | ID  | Description                   |
| ---------------- | --- | ----------------------------- |
| Airtel DTH       | 5   | Airtel Direct-to-Home         |
| DishTv           | 6   | Dish TV                       |
| Sundirect        | 7   | Sun Direct                    |
| TataPlay         | 8   | Tata Play (formerly Tata Sky) |
| Videocon d2h     | 9   | Videocon d2h                  |
| Airtel Mitra DTH | 14  | Airtel Mitra DTH              |
| NXT Digital      | 19  | NXT Digital                   |

### Digital Wallet & Payment Services

| Operator      | ID  | Description         |
| ------------- | --- | ------------------- |
| Airtel Money  | 11  | Airtel Money Wallet |
| Airtel Thanks | 12  | Airtel Thanks       |
| Jio Pos Lite  | 13  | Jio Pos Lite        |
| Mobikwik      | 15  | Mobikwik Wallet     |
| Paytm         | 16  | Paytm Wallet        |
| Amazon        | 17  | Amazon Pay          |
| Freecharge    | 18  | Freecharge Wallet   |
| MyJio         | 20  | MyJio App           |
| Mobikwik (B)  | 21  | Mobikwik (Business) |

### Other Services

| Operator                  | ID  | Description            |
| ------------------------- | --- | ---------------------- |
| du - United Arab Emirates | 22  | du Mobile UAE          |
| BSNL - Bill Payment       | 23  | BSNL Bill Payment      |
| Sundirect Web             | 24  | Sundirect Web Platform |

**Note:** Some operators have additional sub-operator codes. Refer to the complete operator codes documentation for sub-operator IDs, especially for wallet services like Airtel Money, Airtel Thanks, Mobikwik, Paytm, Amazon, and Freecharge.

## State Codes

| State Code | State Name                          | Description                            |
| ---------- | ----------------------------------- | -------------------------------------- |
| 0          | All States                          | All States (Universal)                 |
| 1          | Andhra Pradesh                      | Andhra Pradesh                         |
| 2          | Assam                               | Assam                                  |
| 3          | Bihar / Jharkhand                   | Bihar and Jharkhand                    |
| 4          | Chennai                             | Chennai                                |
| 5          | Delhi / NCR                         | Delhi and National Capital Region      |
| 6          | Gujarat                             | Gujarat                                |
| 7          | Haryana                             | Haryana                                |
| 8          | Himachal Pradesh                    | Himachal Pradesh                       |
| 9          | Jammu and Kashmir                   | Jammu and Kashmir                      |
| 10         | Karnataka                           | Karnataka                              |
| 11         | Kerala                              | Kerala                                 |
| 12         | Kolkata                             | Kolkata                                |
| 13         | Maharashtra and Goa (except Mumbai) | Maharashtra and Goa (excluding Mumbai) |
| 14         | MP / Chattisgarh                    | Madhya Pradesh and Chhattisgarh        |
| 15         | Mumbai                              | Mumbai                                 |
| 16         | North East                          | North Eastern States                   |
| 17         | Orissa                              | Orissa (Odisha)                        |
| 18         | Punjab                              | Punjab                                 |
| 19         | Rajasthan                           | Rajasthan                              |
| 20         | Tamil Nadu                          | Tamil Nadu                             |
| 21         | UP (East)                           | Uttar Pradesh (East)                   |
| 22         | UP (West) / Uttarakhand             | Uttar Pradesh (West) and Uttarakhand   |
| 23         | West Bengal                         | West Bengal                            |
| 24         | Chhattisgarh                        | Chhattisgarh (separate from MP)        |
| 25         | Jharkhand                           | Jharkhand (separate from Bihar)        |

**Note:** State code 0 can be used for universal recharges across all states. Some state codes cover multiple regions (like Bihar/Jharkhand or MP/Chhattisgarh) while others have been separated for more precise targeting.

---

## General Notes

- All balance-related APIs return cached data from the database, not live balance
- The status check API returns cached data from the database, not live status from operator
- Always ensure you have a valid `api_token` for all requests
- Use unique `req_id` values for each recharge request to track transactions properly
- Test mode is available for development and testing purposes

## Support

For additional support and inquiries, contact RealRobo through their XMPP IDs:

- multirobo@xmpp.jp
- multirobo@jabb.im
