export const PARSE_SYSTEM_PROMPT = `You will be given the full text of an Amazon order confirmation email. Your task is to extract structured transaction data.

A single email may contain one or more transactions (one per shipment / order). Each transaction has its own order number and grand total.

For each transaction, extract:
- order_number: the Amazon order ID, e.g. "111-2222222-3333333"
- charge_amount: the grand total charged for this transaction in dollars (a number, e.g. 36.36)
- charge_date: ISO 8601 date the order was placed; if not present in the email body, use the email date provided
- line_items: one entry per distinct product line, each with:
  - name: product name truncated to 40 characters
  - quantity: integer
  - unit_price: dollars
- tax, shipping, discount, gift_card: dollars (each defaults to 0 if not present)
- reasoning: a short explanation of how you derived the totals, especially how the adjustment fields were inferred

Adjustment relationship: charge_amount ≈ sum(unit_price × quantity) + tax + shipping − discount − gift_card.

Amazon order confirmation emails typically do not itemize tax, shipping, discount, or gift_card. Use the difference between the grand total and the items subtotal to infer these:
- If the grand total is higher than the items subtotal, the difference is most likely tax and/or shipping. Put the entire positive delta into "tax" unless the email explicitly mentions a shipping line.
- If the grand total is lower than the items subtotal, the difference is most likely a gift card or discount. Put the entire negative delta into "gift_card" unless the email explicitly mentions a discount/promotion.
- If the grand total equals 0, the entire items subtotal is most likely covered by a gift card.

Always populate the reasoning field with a one-sentence note explaining the adjustment.

Return data using the submit_email_transactions tool. Do not include any conversational text.`;

export const PARSE_TOOL_NAME = "submit_email_transactions";

export const PARSE_TOOL = {
  name: PARSE_TOOL_NAME,
  description: "Submit one or more parsed Amazon order transactions extracted from an order confirmation email.",
  input_schema: {
    type: "object",
    properties: {
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            order_number: { type: "string" },
            charge_amount: { type: "number" },
            charge_date: { type: "string" },
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "integer" },
                  unit_price: { type: "number" },
                },
                required: ["name", "quantity", "unit_price"],
              },
            },
            tax: { type: "number" },
            shipping: { type: "number" },
            discount: { type: "number" },
            gift_card: { type: "number" },
            reasoning: { type: "string" },
          },
          required: [
            "order_number",
            "charge_amount",
            "charge_date",
            "line_items",
            "tax",
            "shipping",
            "discount",
            "gift_card",
            "reasoning",
          ],
        },
      },
    },
    required: ["transactions"],
  },
} as const;
