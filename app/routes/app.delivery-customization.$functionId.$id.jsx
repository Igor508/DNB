import { useState, useEffect } from "react";
import {
  Banner,
  Card,
  InlineGrid,
  InlineStack,
  Box,
  Layout,
  Page,
  TextField,
  Button
} from "@shopify/polaris";
import {DeleteIcon} from '@shopify/polaris-icons';
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ params, request }) => {
  const { functionId, id } = params;
  const { admin } = await authenticate.admin(request);

  if (id != "new") {
    const gid = `gid://shopify/DeliveryCustomization/${id}`;

    const response = await admin.graphql(
      `#graphql
        query getDeliveryCustomization($id: ID!) {
          deliveryCustomization(id: $id) {
            id
            title
            enabled
            metafield(namespace: "$app:delivery-customization", key: "function-configuration") {
              id
              value
            }
          }
        }`,
      {
        variables: {
          id: gid,
        },
      }
    );

    const responseJson = await response.json();
    const deliveryCustomization = responseJson.data.deliveryCustomization;
    const metafieldValue = JSON.parse(deliveryCustomization.metafield.value);

    return {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: metafieldValue.countryCode,
        message: metafieldValue.message,
      }),
    };
  }

  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      countryCode: "",
      message: "",
    }),
  };
};

export const action = async ({ params, request }) => {
  const { functionId, id } = params;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const countryCode = formData.get("countryCode");
  const message = formData.get("message");

  const deliveryCustomizationInput = {
    functionId,
    title: `Change delivery message`,
    enabled: true,
    metafields: [
      {
        namespace: "$app:delivery-customization",
        key: "function-configuration",
        type: "json",
        value: JSON.stringify({
          countryCode,
          message,
        }),
      },
    ],
  };

  if (id != "new") {
    const response = await admin.graphql(
      `#graphql
        mutation updateDeliveryCustomization($id: ID!, $input: DeliveryCustomizationInput!) {
          deliveryCustomizationUpdate(id: $id, deliveryCustomization: $input) {
            deliveryCustomization {
              id
            }
            userErrors {
              message
            }
          }
        }`,
      {
        variables: {
          id: `gid://shopify/DeliveryCustomization/${id}`,
          input: deliveryCustomizationInput,
        },
      }
    );

    const responseJson = await response.json();
    const errors = responseJson.data.deliveryCustomizationUpdate?.userErrors;

    return json({ errors });
  } else {
    const response = await admin.graphql(
      `#graphql
        mutation createDeliveryCustomization($input: DeliveryCustomizationInput!) {
          deliveryCustomizationCreate(deliveryCustomization: $input) {
            deliveryCustomization {
              id
            }
            userErrors {
              message
            }
          }
        }`,
      {
        variables: {
          input: deliveryCustomizationInput,
        },
      }
    );

    const responseJson = await response.json();
    const errors = responseJson.data.deliveryCustomizationCreate?.userErrors;

    return json({ errors });
  }
};

export default function DeliveryCustomization() {
  const submit = useSubmit();
  const actionData = useActionData();
  const navigation = useNavigation();
  const loaderData = useLoaderData();
  const [fields, setFields] = useState([
    { countryCode: '', message: {titleSeg: '', currentVal: '', newVal: ''} }
  ])

  const handleChange = (value, name, index) => {
    const updatedFields = [...fields];
    if(name == 'countryCode') {
      updatedFields[index][name] = value;
    }
    else {
      updatedFields[index]['message'][name] = value;
    }
    setFields(updatedFields);
  };

  const addField = () => {
    setFields([...fields, { countryCode: '', message: {titleSeg: '', currentVal: '', newVal: ''} }]);
  };

  const removeField = (index) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
  };

  useEffect(() => {
    if (loaderData) {
      const parsedData = JSON.parse(loaderData.body);
      const countryCodeStr = parsedData.countryCode;
      const stateCountries = countryCodeStr ? JSON.parse(countryCodeStr) : [];
      const messages = parsedData?.message ? JSON.parse(parsedData?.message) : [];
      const initialFields = stateCountries.map((country, index) => ({
        countryCode: country,
        message: messages[index] || {titleSeg: '', currentVal: '', newVal: ''}
      }));
      setFields(initialFields);
    }
  }, [loaderData]);

  const isLoading = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.errors?.length === 0) {
      open('shopify:admin/settings/shipping/customizations', '_top')
    }
  }, [actionData?.errors]);

  const errorBanner = actionData?.errors?.length ? (
    <Layout.Section>
    <Banner
      title="There was an error creating the customization."
      status="critical"
    >
      <ul>
        {actionData?.errors.map((error, index) => {
          return <li key={`${index}`}>{error.message}</li>;
        })}
      </ul>
    </Banner>
  </Layout.Section>
) : null;

const handleSubmit = () => {
  const allCountryCodes = JSON.stringify(fields.map(item => item.countryCode));
  const allMessages = JSON.stringify(fields.map(item => item.message));
  submit({ countryCode: allCountryCodes, message: allMessages }, { method: "post" });
};

return (
  <Page fullWidth
    title="Change delivery message"
    backAction={{
      content: "Delivery customizations",
      onAction: () => open('shopify:admin/settings/shipping/customizations', '_top')
    }}
    primaryAction={{
      content: "Save",
      loading: isLoading,
      onAction: handleSubmit,
    }}
    secondaryActions={[
      {
        content: 'Add',
        onAction: addField
      }
    ]}
  >
    {errorBanner}
    <Form method="post">
      <Layout>
        {fields.map((field, index) => (
          <Layout.Section key={index}>
            <Card>
              <InlineGrid columns={1} gap={300}>
                <Box>
                  <TextField
                    name="countryCode"
                    type="text"
                    label="Country code"
                    value={field.countryCode}
                    onChange={(newValue) => handleChange(newValue, 'countryCode', index)}
                    disabled={isLoading}
                    requiredIndicator
                    autoComplete="on"
                  />
                </Box>
                <Box>
                  <TextField
                    name="titleSegment"
                    type="text"
                    label="Shipping method includes (e.g. 'Standard', 'Express', 'International')"
                    value={field.message.titleSeg}
                    onChange={(newValue) => handleChange(newValue, 'titleSeg', index)}
                    disabled={isLoading}
                    requiredIndicator
                    autoComplete="on"
                  />
                </Box>
                <InlineGrid columns={2} gap={300}>
                  <Box>
                    <TextField
                      name="currentValue"
                      type="text"
                      label="Current value"
                      value={field.message.currentVal}
                      onChange={(newValue) => handleChange(newValue, 'currentVal', index)}
                      disabled={isLoading}
                      requiredIndicator
                      autoComplete="off"
                    />
                  </Box>
                  <Box>
                    <TextField
                      name="newValue"
                      type="text"
                      label="New value"
                      value={field.message.newVal}
                      onChange={(newValue) => handleChange(newValue, 'newVal', index)}
                      disabled={isLoading}
                      requiredIndicator
                      autoComplete="off"
                    />
                  </Box>
                </InlineGrid>
                <InlineStack align="end">
                  <Button icon={DeleteIcon} accessibilityLabel="Remove stateCountry" onClick={() => removeField(index)} />
                </InlineStack>
              </InlineGrid>
            </Card>
          </Layout.Section>
        ))}
      </Layout>
    </Form>
  </Page>
);
}
