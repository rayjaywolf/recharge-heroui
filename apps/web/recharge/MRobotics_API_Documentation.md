# MRobotics API Documentation

This document provides comprehensive API documentation for MRobotics recharge automation services including mobile recharge, bill payment, DTH services, and balance checking APIs.

## Base URL

```
https://mrobotics.in/api/
```

## Authentication

All API requests require an `api_token` parameter. Use your provided API token in the format:

```
api_token=12345678-1234-1234-1234-123456789012
```

---

## 1. Mobile Recharge API

### Endpoint

```
POST https://mrobotics.in/api/recharge
```

### Parameters

| Parameter   | Type    | Required | Description                                             |
| ----------- | ------- | -------- | ------------------------------------------------------- |
| api_token   | string  | Yes      | Your API authentication token                           |
| mobile_no   | string  | Yes      | 10-digit mobile number                                  |
| amount      | integer | Yes      | Recharge amount                                         |
| company_id  | integer | Yes      | Mobile operator company ID                              |
| order_id    | string  | Yes      | Unique transaction ID                                   |
| is_stv      | boolean | No       | Special Tariff Voucher (default: false)                 |
| lapu_id     | integer | No       | Lapu ID for Lapu-wise recharge (from lapu list)         |
| only_roffer | boolean | No       | Only roffer recharge (works with mobile operators only) |

### Example Request

```
api_token=12345678-1234-1234-1234-123456789012&mobile_no=9876543210&amount=999&company_id=1&order_id=5813271&is_stv=false
```

### Important Notes

#### Operator Specific Instructions

- **Jio**: For Jio Prime + Plans please pass `is_stv=true`
- **Bsnl**: `is_stv=false` means TopUp and `is_stv=true` means Bsnl STV
- **DTH Recharge using Mobile no**: Set `is_stv=true` and send mobile_no instead of Subscriber ID
- **DTH Recharge**: Recharge will fail if multiple accounts exist on the same mobile number

#### Additional Parameters

- **Lapu Wise Recharge**: Add `&lapu_id=[lapu_id]` for recharge in selected Lapu
- **Only Roffer Recharge**: Add `&only_roffer=true` for roffer-only recharge (mobile operators only)

### Sample Response

```json
{
  "balance": 605.52,
  "roffer": 0,
  "status": "success/failure/pending",
  "recharge_date": "2019-02-13T16:03:51.498Z",
  "id": 56156,
  "response": "Transaction Successful",
  "lapu_id": 1,
  "mobile_no": "9876543210",
  "amount": 10,
  "tnx_id": "GJR180151601651065106"
}
```

---

## 2. Mobile Recharge Statewise API

### Endpoint

```
POST https://mrobotics.in/api/recharge_statewise
```

### Parameters

| Parameter  | Type    | Required | Description                                                                                                               |
| ---------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| api_token  | string  | Yes      | Your API authentication token                                                                                             |
| mobile_no  | string  | Yes      | 10-digit mobile number                                                                                                    |
| amount     | integer | Yes      | Recharge amount                                                                                                           |
| company_id | integer | Yes      | Mobile operator company ID                                                                                                |
| order_id   | string  | Yes      | Unique transaction ID                                                                                                     |
| is_stv     | boolean | No       | Special Tariff Voucher (default: false)                                                                                   |
| state_code | string  | No       | State code (optional) - see State Codes table below. If not passed, state code will be selected from mobile number series |
| no_roaming | boolean | No       | Default is false. If true, recharge will not process if lapu with state is not present                                    |
| lapu_id    | integer | No       | Lapu ID for Lapu-wise recharge (from lapu list)                                                                           |

### Example Request

```
api_token=12345678-1234-1234-1234-123456789012&mobile_no=9876543210&amount=999&company_id=1&order_id=5813271&is_stv=false&state_code=AP&no_roaming=true
```

---

## State Codes Reference

| State Name                    | State Code |
| ----------------------------- | ---------- |
| Andhra Pradesh & Telangana    | AP         |
| Assam                         | AS         |
| Bihar & Jharkhand             | BR         |
| Delhi                         | DL         |
| Gujarat                       | GJ         |
| Himachal Pradesh              | HP         |
| Haryana                       | HR         |
| Jammu and Kashmir             | JK         |
| Kerala & Lakshadweep          | KL         |
| Karnataka                     | KA         |
| Kolkata                       | KO         |
| Maharashtra & Goa             | MH         |
| Madhya Pradesh & Chhattisgarh | MP         |
| Mumbai                        | MU         |
| North East                    | NE         |
| Odisha                        | OR         |
| Punjab                        | PB         |
| Rajasthan                     | RJ         |
| Tamil Nadu                    | TN         |
| UP (East)                     | UE         |
| UP (West)                     | UW         |
| West Bengal                   | WB         |
| Ghaziabad & Noida             | GB         |
| Chennai                       | CI         |

---

## 3. Bill Payment API

### Endpoint

```
POST https://mrobotics.in/api/multirecharge
```

### Parameters

| Parameter     | Type    | Required | Description                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| api_token     | string  | Yes      | Your API authentication token                   |
| mobile_no     | string  | Yes      | Customer mobile/account number                  |
| amount        | integer | Yes      | Payment amount                                  |
| company_id    | integer | Yes      | Service provider company ID                     |
| subcompany_id | integer | Yes      | Sub-service provider ID                         |
| order_id      | string  | Yes      | Unique transaction ID                           |
| is_stv        | boolean | No       | Special Tariff Voucher (default: false)         |
| lapu_id       | integer | No       | Lapu ID for Lapu-wise recharge (from lapu list) |
| coupon        | string  | No       | Coupon code for True Balance (e.g., SUPER6)     |
| field2        | string  | No       | Extra data parameter for Airtel Money           |

### Important Notes

#### Bill Payment Specific Instructions

- **Lapu Wise Recharge**: Add `&lapu_id=[lapu_id]` for recharge in selected Lapu
- **True Balance**: For coupon codes, pass `&coupon=CODE` in POST data (e.g., `&coupon=SUPER6`)
- **Airtel Money**: For extra data, pass `&field2=` in POST data

### Example Request

```
api_token=12345678-1234-1234-1234-123456789012&mobile_no=9375937593&amount=49&company_id=5&subcompany_id=1&order_id=1256348&is_stv=false
```

---

## 4. DTH Statewise API

### Endpoint

```
POST https://mrobotics.in/api/dth_statewise
```

### Parameters

| Parameter          | Type    | Required | Description                                     |
| ------------------ | ------- | -------- | ----------------------------------------------- |
| api_token          | string  | Yes      | Your API authentication token                   |
| mobile_no          | string  | Yes      | DTH customer ID/mobile number                   |
| amount             | integer | Yes      | Recharge amount                                 |
| company_id         | integer | Yes      | DTH operator company ID                         |
| order_id           | string  | Yes      | Unique transaction ID                           |
| is_stv             | boolean | No       | Special Tariff Voucher (default: false)         |
| bypass_state_check | boolean | No       | Set to true to bypass state check               |
| lapu_id            | integer | No       | Lapu ID for Lapu-wise recharge (from lapu list) |

### Example Request

```
api_token=12345678-1234-1234-1234-123456789012&mobile_no=9375937593&amount=49&company_id=5&order_id=1256348&is_stv=false
```

### Important Notes

#### DTH Specific Instructions

- **DTH Recharge using Mobile no**: Set `is_stv=true` and send mobile_no instead of Subscriber ID
- **DTH Recharge**: Recharge will fail if multiple accounts exist on the same mobile number
- **Tata Sky App Issue**: All recharges will fail if Tata Sky app is down
- **Multi State Route in Single Sim**: Set the state in Tata Sky Lapu at Lapu State Editor

#### Additional Parameters

- **bypass_state_check**: Set to true to bypass state check
- **Lapu Wise Recharge**: Add `&lapu_id=[lapu_id]` for recharge in selected Lapu

---

## 5. Lapu Balance API

### Endpoint

```
POST https://mrobotics.in/api/lapu_balance
```

### Parameters

| Parameter | Type    | Required | Description                   |
| --------- | ------- | -------- | ----------------------------- |
| api_token | string  | Yes      | Your API authentication token |
| lapu_id   | integer | Yes      | Lapu ID                       |

### Example Request

```
?api_token=12345678-1234-1234-1234-123456789012&lapu_id=1
```

### Note

- Lapu Balance API returns value from database (not live data)

---

## 6. Operator Balance API

### Endpoint

```
POST https://mrobotics.in/api/operator_balance
```

### Parameters

| Parameter | Type   | Required | Description                   |
| --------- | ------ | -------- | ----------------------------- |
| api_token | string | Yes      | Your API authentication token |

### Example Request

```
?api_token=12345678-1234-1234-1234-123456789012
```

### Sample Response

```json
{
  "error": false,
  "data": {
    "AirtelDTH": 0,
    "TataSky": 0,
    "Dishtv": 0,
    "Bsnl": 0,
    "Airtel": 0,
    "Vodafone": 0
  }
}
```

---

## 7. Status API

### Endpoint

```
POST https://mrobotics.in/api/order_id_status
```

### Parameters

| Parameter | Type   | Required | Description                   |
| --------- | ------ | -------- | ----------------------------- |
| api_token | string | Yes      | Your API authentication token |
| order_id  | string | Yes      | Transaction order ID          |

### Example Request

```
?api_token=12345678-1234-1234-1234-123456789012&order_id=1
```

### Important Notes

- Please send the Status Request in Query format if possible
- Only current date recharge can be searched
- Use GET method with query parameters

---

## Response Status Values

| Status  | Description                        |
| ------- | ---------------------------------- |
| success | Transaction completed successfully |
| failure | Transaction failed                 |
| pending | Transaction is being processed     |

## Common Response Fields

| Field         | Type     | Description              |
| ------------- | -------- | ------------------------ |
| balance       | decimal  | Available balance        |
| roffer        | integer  | Special offers           |
| status        | string   | Transaction status       |
| recharge_date | datetime | Transaction timestamp    |
| id            | integer  | Transaction ID           |
| response      | string   | Response message         |
| lapu_id       | integer  | Lapu identifier          |
| mobile_no     | string   | Mobile number            |
| amount        | integer  | Transaction amount       |
| tnx_id        | string   | Transaction reference ID |

## Error Handling

- Ensure all required parameters are provided
- Validate mobile numbers (10 digits)
- Use unique order_id for each transaction
- Check API token validity
- Monitor balance before transactions

## Support

For technical support and API-related queries:

- **Mobile & WhatsApp**: 9375937593
- **Website**: https://mrobotics.in

---

_This documentation is based on MRobotics API specifications. For the most up-to-date information, please refer to the official API documentation portal._
