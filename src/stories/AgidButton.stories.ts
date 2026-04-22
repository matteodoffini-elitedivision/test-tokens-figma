import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { DesignAngularKitModule } from 'design-angular-kit';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

export default {
  title: 'Design Angular Kit/Button',
  decorators: [
    moduleMetadata({
      imports: [DesignAngularKitModule.forRoot()],
      schemas: [CUSTOM_ELEMENTS_SCHEMA], // Questo serve per accettare it-button senza importare la classe
    }),
  ],
} as Meta;

export const Primary: StoryObj = {
  render: (args) => ({
    props: args,
    // Proviamo a usare la label come contenuto del tag invece che come attributo
    // Molte versioni usano il transclusion (ng-content)
    template: `
      <div style="padding: 2rem;">
        <button class="btn btn-primary">
          {{label}}
        </button>
      </div>
    `,
  }),
  args: {
    variant: 'primary',
    label: 'Bottone Brandizzato',
  },
};
