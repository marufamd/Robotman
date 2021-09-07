import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box } from '@chakra-ui/react';

const ModalAccordion = ({ name, children }: { name: string; children: React.ReactNode }) => {
	return (
		<Accordion allowToggle mb={4} border="1px" borderColor="inherit" borderRadius="lg">
			<AccordionItem>
				<AccordionButton>
					<Box flex="1" textAlign="left">
						{name}
					</Box>
					<AccordionIcon />
				</AccordionButton>
				<AccordionPanel>{children}</AccordionPanel>
			</AccordionItem>
		</Accordion>
	);
};

export default ModalAccordion;
