import React from "react";
import { useAuth, useSignUp } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import { Compass } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";

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
    return null;
  }

  const isFetching = fetchStatus === "fetching";

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <Box className="flex-1 justify-center px-5 py-8 bg-[#F5F1E6]">
        <Box className="bg-[#FBF8F1] border border-[#E4D9C4] rounded-2xl px-6 py-7 shadow-md">
          <VStack space="xs" className="items-center mb-5">
            <Box className="w-14 h-14 rounded-full bg-[#BF4E27] items-center justify-center mb-1">
              <Compass size={26} className="text-[#F5F1E6]" />
            </Box>
            <Text className="text-[#1F3A2E] text-lg font-bold">
              Travel Health Guide
            </Text>
            <Text className="text-[#6B5F52] text-xs">
              Your personal trip advisor
            </Text>
            <Box className="w-full border-t border-dashed border-[#C08552]/50 mt-4" />
          </VStack>

          <VStack space="md">
            <VStack space="xs" className="mb-2">
              <Heading size="xl" className="text-[#1F3A2E]">
                Verify your account
              </Heading>
              <Box className="h-1 w-10 rounded-full bg-[#BF4E27]" />
            </VStack>

            <Input
              size="md"
              variant="outline"
              className="bg-[#F5F1E6] border-[#E4D9C4] rounded-xl data-[focus=true]:border-[#1F3A2E]"
            >
              <InputField
                value={code}
                placeholder="Enter your verification code"
                placeholderTextColor="#9C8F7E"
                onChangeText={setCode}
                keyboardType="numeric"
                className="text-[#2A2420]"
              />
            </Input>

            {errors?.fields?.code && (
              <Text className="text-sm text-[#A23B2D] -mt-2">
                {errors.fields.code.message}
              </Text>
            )}

            <Button
              className="mt-2 bg-[#BF4E27] rounded-xl active:bg-[#9C3D1D]"
              isDisabled={isFetching}
              onPress={handleVerify}
            >
              <ButtonText className="text-[#F5F1E6] font-semibold uppercase tracking-wide">
                Verify
              </ButtonText>
            </Button>

            <Button
              variant="link"
              onPress={() => signUp.verifications.sendEmailCode()}
            >
              <ButtonText className="text-[#1F3A2E] font-medium">
                I need a new code
              </ButtonText>
            </Button>
          </VStack>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="flex-1 justify-center px-5 py-8 bg-[#F5F1E6]">
      <Box className="bg-[#FBF8F1] border border-[#E4D9C4] rounded-2xl px-6 py-7 shadow-md">
        <VStack space="xs" className="items-center mb-5">
          <Box className="w-14 h-14 rounded-full bg-[#BF4E27] items-center justify-center mb-1">
            <Compass size={26} className="text-[#F5F1E6]" />
          </Box>
          <Text className="text-[#1F3A2E] text-lg font-bold">
            Travel Health Guide
          </Text>
          <Text className="text-[#6B5F52] text-xs">
            Your personal trip advisor
          </Text>
          <Box className="w-full border-t border-dashed border-[#C08552]/50 mt-4" />
        </VStack>

        <VStack space="md">
          <VStack space="xs" className="mb-2">
            <Heading size="xl" className="text-[#1F3A2E]">
              Sign up
            </Heading>
            <Box className="h-1 w-10 rounded-full bg-[#BF4E27]" />
            <Text size="sm" className="text-[#6B5F52] mt-1">
              Start planning your next trip.
            </Text>
          </VStack>

          <VStack space="xs">
            <Text
              size="xs"
              className="font-semibold uppercase tracking-widest text-[#6B5F52]"
            >
              Email address
            </Text>
            <Input
              size="md"
              variant="outline"
              className="bg-[#F5F1E6] border-[#E4D9C4] rounded-xl data-[focus=true]:border-[#1F3A2E]"
            >
              <InputField
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Enter email"
                placeholderTextColor="#9C8F7E"
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                className="text-[#2A2420]"
              />
            </Input>
            {errors?.fields?.emailAddress && (
              <Text className="text-xs text-[#A23B2D]">
                {errors.fields.emailAddress.message}
              </Text>
            )}
          </VStack>

          <VStack space="xs">
            <Text
              size="xs"
              className="font-semibold uppercase tracking-widest text-[#6B5F52]"
            >
              Password
            </Text>
            <Input
              size="md"
              variant="outline"
              className="bg-[#F5F1E6] border-[#E4D9C4] rounded-xl data-[focus=true]:border-[#1F3A2E]"
            >
              <InputField
                value={password}
                placeholder="Enter password"
                placeholderTextColor="#9C8F7E"
                secureTextEntry={true}
                onChangeText={setPassword}
                className="text-[#2A2420]"
              />
            </Input>
            {errors?.fields?.password && (
              <Text className="text-xs text-[#A23B2D]">
                {errors.fields.password.message}
              </Text>
            )}
          </VStack>

          <Button
            className="mt-2 bg-[#BF4E27] rounded-xl active:bg-[#9C3D1D]"
            isDisabled={!emailAddress || !password || isFetching}
            onPress={handleSubmit}
          >
            <ButtonText className="text-[#F5F1E6] font-semibold uppercase tracking-wide">
              Sign up
            </ButtonText>
          </Button>

          <HStack space="xs" className="mt-3 items-center justify-center">
            <Text className="text-[#6B5F52]">Already have an account?</Text>
            <Link href="/sign-in" asChild>
              <Button variant="link" className="p-0 h-auto">
                <ButtonText className="text-[#1F3A2E] underline font-medium">
                  Sign in
                </ButtonText>
              </Button>
            </Link>
          </HStack>

          <Box nativeID="clerk-captcha" />
        </VStack>
      </Box>
    </Box>
  );
}
