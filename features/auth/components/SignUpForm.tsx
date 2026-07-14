import React from "react";
import { useAuth, useSignUp } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";

// Gluestack UI Imports
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";

export function SignUpForm() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  const handleSubmit = async () => {
    const { error } = await signUp.password({
      emailAddress,
      password,
    });
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({
      code,
    });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session?.currentTask);
            return;
          }

          const url = decorateUrl("/home");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url as Href);
          }
        },
      });
    } else {
      console.error("Sign-up attempt not complete:", signUp);
    }
  };

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  const isFetching = fetchStatus === "fetching";

  // --- Verification Flow View ---
  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <Box className="flex-1 p-5 bg-background-0">
        <VStack space="md">
          <Heading size="xl" className="mb-2">
            Verify your account
          </Heading>

          <Input size="md" variant="outline">
            <InputField
              value={code}
              placeholder="Enter your verification code"
              onChangeText={setCode}
              keyboardType="numeric"
            />
          </Input>

          {errors?.fields?.code && (
            <Text className="text-sm text-error-600 -mt-2">
              {errors.fields.code.message}
            </Text>
          )}

          <Button
            className="mt-2"
            isDisabled={isFetching}
            onPress={handleVerify}
          >
            <ButtonText>Verify</ButtonText>
          </Button>

          <Button
            variant="link"
            onPress={() => signUp.verifications.sendEmailCode()}
          >
            <ButtonText className="text-primary-500">
              I need a new code
            </ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  // --- Initial Sign Up Flow View ---
  return (
    <Box className="flex-1 justify-center p-5 bg-background-0">
      <VStack space="md">
        <Heading size="xl" className="mb-2">
          Sign up
        </Heading>

        <VStack space="xs">
          <Text size="sm" className="font-semibold">
            Email address
          </Text>
          <Input size="md" variant="outline">
            <InputField
              autoCapitalize="none"
              value={emailAddress}
              placeholder="Enter email"
              onChangeText={setEmailAddress}
              keyboardType="email-address"
            />
          </Input>
          {errors?.fields?.emailAddress && (
            <Text className="text-xs text-error-600">
              {errors.fields.emailAddress.message}
            </Text>
          )}
        </VStack>

        <VStack space="xs">
          <Text size="sm" className="font-semibold">
            Password
          </Text>
          <Input size="md" variant="outline">
            <InputField
              value={password}
              placeholder="Enter password"
              secureTextEntry={true}
              onChangeText={setPassword}
            />
          </Input>
          {errors?.fields?.password && (
            <Text className="text-xs text-error-600">
              {errors.fields.password.message}
            </Text>
          )}
        </VStack>

        <Button
          className="mt-2"
          isDisabled={!emailAddress || !password || isFetching}
          onPress={handleSubmit}
        >
          <ButtonText>Sign up</ButtonText>
        </Button>

        <HStack space="xs" className="mt-3 items-center justify-center">
          <Text>Already have an account?</Text>
          <Link href="/sign-in" asChild>
            <Button variant="link" className="p-0 h-auto">
              <ButtonText className="text-primary-500 underline font-medium">
                Sign in
              </ButtonText>
            </Button>
          </Link>
        </HStack>

        {/* Required for Clerk's bot protection */}
        <Box nativeID="clerk-captcha" />
      </VStack>
    </Box>
  );
}
