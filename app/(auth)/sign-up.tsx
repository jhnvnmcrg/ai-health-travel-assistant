import React from "react";
import { useAuth, useSignUp } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { AuthField, AuthScreen } from "@/components/AuthScreen";
import { StatusScreen } from "@/components/StatusScreen";

/** "email_address" reads badly in a sentence. */
function humanizeField(field: string): string {
  return field.replace(/_/g, " ");
}

export default function SignUpScreen() {
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
    // `finalize` is navigating. A bare `null` here is a blank screen for
    // however long that takes.
    return <StatusScreen message="Setting up your account..." />;
  }

  const isFetching = fetchStatus === "fetching";

  /**
   * Depending on how the Clerk instance is configured, sign-up can require
   * fields this screen doesn't collect — a username, a phone number. Those used
   * to fall through to the initial form, where pressing the button appeared to
   * do nothing at all. Naming the requirement is not a fix for it, but it is
   * the difference between a dead end and a dead end you can understand.
   */
  if (
    signUp.status === "missing_requirements" &&
    signUp.missingFields.length > 0
  ) {
    return (
      <AuthScreen
        title="One more thing"
        subtitle="This account needs details this app can't collect yet."
      >
        <VStack space="lg">
          <Text size="sm" className="text-muted-foreground">
            Still required: {signUp.missingFields.map(humanizeField).join(", ")}
            . Finish signing up on the web, or ask whoever manages this app to
            drop the requirement.
          </Text>

          <Button
            size="lg"
            className="rounded-xl"
            onPress={() => signUp.reset()}
          >
            <ButtonText>Start over</ButtonText>
          </Button>
        </VStack>
      </AuthScreen>
    );
  }

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address")
  ) {
    return (
      <AuthScreen
        title="Verify your email"
        subtitle={`We sent a code to ${emailAddress || "your inbox"}.`}
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
              onPress={() => signUp.verifications.sendEmailCode()}
            >
              <ButtonText>I need a new code</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Create an account"
      subtitle="Start planning your next trip."
      footer={
        <HStack space="xs" className="items-center justify-center">
          <Text size="sm" className="text-muted-foreground">
            Already have an account?
          </Text>
          <Link href="/sign-in" asChild>
            <Button variant="link" size="sm" className="px-0">
              <ButtonText>Sign in</ButtonText>
            </Button>
          </Link>
        </HStack>
      }
    >
      <VStack space="lg">
        <AuthField
          label="Email address"
          error={errors?.fields?.emailAddress?.message}
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
              placeholder="Create a password"
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
          <ButtonText>Sign up</ButtonText>
        </Button>

        <Box nativeID="clerk-captcha" />
      </VStack>
    </AuthScreen>
  );
}
