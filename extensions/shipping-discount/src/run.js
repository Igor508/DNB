/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */

export function run(input) {
  const targets = [];
  const CART_AMOUNT = input.cart.cost.subtotalAmount.amount;
  const CURRENT_SHIPPING_PRICE = parseFloat(input.cart.deliveryGroups[0].selectedDeliveryOption.cost.amount || 0);

  let discount_value = {
    fixedAmount: {
      amount: "0.00"
    }
  };

  const discountTierJSON = JSON.parse(input.discountNode.metafield.value);
  const shippingPriceArr = discountTierJSON.shippingPrice.split(', ');
  const minAmountArr = discountTierJSON.minAmount.split(', ');
  const maxAmountArr = discountTierJSON.maxAmount.split(', ');
  const percentageArr = discountTierJSON.percentage.split(', ');

  let index = 0;

  for(const tier of shippingPriceArr) {

    const shippingPrice = parseFloat(tier);
    const minAmount = parseFloat(minAmountArr[index]);
    const maxAmount = parseFloat(maxAmountArr[index]);
    const percentage = parseFloat(percentageArr[index]);

    if(shippingPrice == CURRENT_SHIPPING_PRICE && CART_AMOUNT >= minAmount && CART_AMOUNT <= maxAmount) {
      const discountAmount = CURRENT_SHIPPING_PRICE - CART_AMOUNT * percentage / 100.0;
      if(discountAmount < 0) {
        discount_value = {
          percentage: { value: 100 }
        };
      }
      else {
        discount_value = {
          fixedAmount: {
            amount: discountAmount.toFixed(2)
          }
        };
      }
    }
    index ++;
  }

  for (const group of input.cart.deliveryGroups) {
    for (const option of group.deliveryOptions) {
      targets.push({
        deliveryOption: {
          handle: option.handle
        }
      });
    }
  }

  // if (CART_AMOUNT > 1200) {
  //   discount_value = {
  //     percentage: { value: 100 }
  //   };
  // } 
  // else {
  //   let shipping_rate = 0.12

  //   if (CART_AMOUNT > 600) {
  //     shipping_rate = 0.06;
  //   }

  //   let discount_amount = CURRENT_SHIPPING_PRICE - CART_AMOUNT * shipping_rate;
  //   if(discount_amount < 0) {
  //     discount_value = {
  //       percentage: { value: 100 }
  //     };
  //   }
  //   else {
  //     discount_value = {
  //       fixedAmount: {
  //         amount: discount_amount.toFixed(2)
  //       }
  //     };
  //   }
  // }

  return {
    discounts: [
      {
        value: discount_value,
        targets: targets
      }
    ]
  };
}
