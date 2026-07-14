import React, { useEffect } from "react";
import { useSignIn, useUser } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";

export function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);

  const [isSynced, setIsSynced] = React.useState(false);
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  useEffect(() => {
    const synchronize = async () => {
      if (!isLoaded || !user || isSynced) return;

      try {
        await syncUser({
          clerkUserId: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? "",
          displayName: user.fullName ?? undefined,
        });

        setIsSynced(true);

        router.replace("/home");
      } catch (err) {
        console.error("Failed to sync user:", err);
      }
    };

    synchronize();
  }, [isLoaded, user, isSynced, syncUser, router]);

  const handleSubmit = async () => {
    const { error } = await signIn.password({
      emailAddress,
      password,
    });
    if (error) {
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
          }
        },
      });
    } else if (signIn.status === "needs_second_factor") {
    } else if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors.find(
        (factor) => factor.strategy === "email_code",
      );

      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
          }
        },
      });
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const isFetching = fetchStatus === "fetching";

  if (signIn.status === "needs_client_trust") {
    return (
      <Box className="flex-1 justify-center p-5 bg-background-0">
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

          <Button variant="link" onPress={() => signIn.mfa.sendEmailCode()}>
            <ButtonText className="text-primary-500">
              I need a new code
            </ButtonText>
          </Button>

          <Button variant="link" onPress={() => signIn.reset()}>
            <ButtonText className="text-primary-500">Start over</ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box className="flex-1 justify-center p-5 bg-background-0">
      <VStack space="md">
        <Heading size="xl" className="mb-2">
          Sign in
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
          {errors?.fields?.identifier && (
            <Text className="text-xs text-error-600">
              {errors.fields.identifier.message}
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
          <ButtonText>Continue</ButtonText>
        </Button>

        <HStack space="xs" className="mt-3 items-center justify-center">
          <Text>Don't have an account?</Text>
          <Link href="/sign-up" asChild>
            <Button variant="link" className="p-0 h-auto">
              <ButtonText className="text-primary-500 underline font-medium">
                Sign up
              </ButtonText>
            </Button>
          </Link>
        </HStack>
      </VStack>
    </Box>
  );
}
