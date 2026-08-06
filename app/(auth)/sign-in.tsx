import React from "react";
import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { AuthField, AuthScreen } from "@/components/AuthScreen";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  // The Convex user row is created by app/(protected)/_layout.tsx, which both
  // this flow and sign-up pass through.

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
            return;
          }

          router.replace("/home");
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
            return;
          }

          router.replace("/home");
        },
      });
    } else {
      console.error("Sign-in attempt not complete:", signIn);
    }
  };

  const isFetching = fetchStatus === "fetching";

  if (signIn.status === "needs_client_trust") {
    return (
      <AuthScreen
        title="Verify it's you"
        subtitle="Enter the code we emailed you."
      >
        <VStack space="lg">
          <AuthField
            label="Verification code"
            error={errors?.fields?.code?.message}
          >
            <Input className="h-11 rounded-xl bg-card">
              <InputField
                value={code}
                placeholder="Enter your verification code"
                onChangeText={setCode}
                keyboardType="numeric"
                className="text-foreground"
              />
            </Input>
          </AuthField>

          <Button
            size="lg"
            className="rounded-xl"
            isDisabled={isFetching}
            onPress={handleVerify}
          >
            <ButtonText>Verify</ButtonText>
          </Button>

          <VStack className="items-center">
            <Button
              variant="link"
              size="sm"
              onPress={() => signIn.mfa.sendEmailCode()}
            >
              <ButtonText>I need a new code</ButtonText>
            </Button>

            <Button variant="link" size="sm" onPress={() => signIn.reset()}>
              <ButtonText>Start over</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Sign in"
      subtitle="Pick up your trip where you left off."
      footer={
        <HStack space="xs" className="items-center justify-center">
          <Text size="sm" className="text-muted-foreground">
            Don&apos;t have an account?
          </Text>
          <Link href="/sign-up" asChild>
            <Button variant="link" size="sm" className="px-0">
              <ButtonText>Sign up</ButtonText>
            </Button>
          </Link>
        </HStack>
      }
    >
      <VStack space="lg">
        <AuthField
          label="Email address"
          error={errors?.fields?.identifier?.message}
        >
          <Input className="h-11 rounded-xl bg-card">
            <InputField
              autoCapitalize="none"
              value={emailAddress}
              placeholder="you@example.com"
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              className="text-foreground"
            />
          </Input>
        </AuthField>

        <AuthField label="Password" error={errors?.fields?.password?.message}>
          <Input className="h-11 rounded-xl bg-card">
            <InputField
              value={password}
              placeholder="Enter password"
              secureTextEntry={true}
              onChangeText={setPassword}
              className="text-foreground"
            />
          </Input>
        </AuthField>

        <Button
          size="lg"
          className="rounded-xl"
          isDisabled={!emailAddress || !password || isFetching}
          onPress={handleSubmit}
        >
          <ButtonText>Continue</ButtonText>
        </Button>
      </VStack>
    </AuthScreen>
  );
}
